import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PistonService } from './piston.service';
import { PhaseEvaluatorService } from './phase-evaluator.service';
import { SettingsService } from '../settings/settings.service';
import { AnalyticsGateway } from '../analytics/analytics.gateway';

export interface SubmitDto {
  content: string;
  userId: string;
}

export interface SubmitResult {
  passed: boolean;
  feedback: string;
  achEarned: number;
}

@Injectable()
export class SubmissionService {
  constructor(
    @Inject('DB_POOL') private pool: Pool,
    private piston: PistonService,
    private evaluator: PhaseEvaluatorService,
    private settings: SettingsService,
    private analytics: AnalyticsGateway,
  ) {}

  async submit(phaseId: string, dto: SubmitDto): Promise<SubmitResult> {
    const { rows: [phase] } = await this.pool.query(
      `SELECT p.id, p.kind, p.content, c.id as challenge_id, c.teacher_id, c.title as challenge_title
       FROM challenge_phase p
       JOIN challenge c ON c.id = p.challenge_id
       WHERE p.id = $1`,
      [phaseId],
    );
    if (!phase) throw new Error('Phase not found');

    let passed = false;
    let feedback = '';

    if (phase.kind === 'conceptual') {
      const { question, rubric } = phase.content as { question: string; rubric: string };
      const keys = await this.settings.getEncryptedKeys(dto.userId);
      const result = await this.evaluator.evaluateConceptual(keys, dto.content, rubric, question);
      passed = result.passed;
      feedback = result.feedback;
    } else {
      const { language, tests } = phase.content as {
        language: string;
        tests: Array<{ stdin: string; expected_stdout: string }>;
      };
      const result = await this.piston.run(language, dto.content, tests);
      passed = result.passed;
      feedback = passed
        ? `Todos los tests pasaron (${tests.length}/${tests.length})`
        : `${result.results.filter(r => !r.passed).length} test(s) fallaron`;
    }

    await this.pool.query(
      'INSERT INTO submission (user_id, phase_id, content, passed, feedback) VALUES ($1, $2, $3, $4, $5)',
      [dto.userId, phaseId, dto.content, passed, feedback],
    );

    // ACH: +25 for passing code phase, +10 for conceptual
    const achEarned = passed ? (phase.kind === 'code' ? 25 : 10) : 0;
    if (achEarned > 0) {
      await this.pool.query(
        `INSERT INTO ach_transaction (user_id, amount, reason) VALUES ($1, $2, $3)
         ON CONFLICT (user_id, reason) DO NOTHING`,
        [dto.userId, achEarned, `phase_complete_${phaseId}`],
      );
      await this.pool.query(
        `INSERT INTO lumen_progress (user_id, ach_balance) VALUES ($1, $2)
         ON CONFLICT (user_id) DO UPDATE SET ach_balance = lumen_progress.ach_balance + EXCLUDED.ach_balance, updated_at = NOW()`,
        [dto.userId, achEarned],
      );
    }

    if (phase.teacher_id) {
      this.analytics.emitSubmission(phase.teacher_id, {
        userId: dto.userId,
        challengeId: phase.challenge_id,
        challengeTitle: phase.challenge_title,
        phaseId,
        passed,
        timestamp: new Date().toISOString(),
      });
    }

    return { passed, feedback, achEarned };
  }
}
