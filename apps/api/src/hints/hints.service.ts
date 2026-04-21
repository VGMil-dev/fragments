import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { AiProviderService } from '../ai-provider/ai-provider.service';
import { SettingsService } from '../settings/settings.service';

export interface HintResult {
  hint: string;
  level: number;
  source: 'predefined' | 'ai';
}

@Injectable()
export class HintsService {
  constructor(
    @Inject('DB_POOL') private pool: Pool,
    private readonly ai: AiProviderService,
    private readonly settings: SettingsService,
  ) {}

  async getHint(phaseId: string, userId: string, requestedLevel: number): Promise<HintResult> {
    const { rows: [phase] } = await this.pool.query(
      'SELECT id, kind, content FROM challenge_phase WHERE id = $1',
      [phaseId],
    );

    const { rows: [predefined] } = await this.pool.query(
      'SELECT content FROM challenge_hint WHERE phase_id = $1 AND level <= $2 ORDER BY level DESC LIMIT 1',
      [phaseId, requestedLevel],
    );

    let hint: string;
    let source: 'predefined' | 'ai';

    if (predefined) {
      hint = predefined.content;
      source = 'predefined';
    } else {
      hint = await this.generateAiHint(userId, phase, requestedLevel);
      source = 'ai';
    }

    await this.pool.query(
      'INSERT INTO hint_event (user_id, phase_id, hint_level) VALUES ($1, $2, $3)',
      [userId, phaseId, requestedLevel],
    );

    return { hint, level: requestedLevel, source };
  }

  private async generateAiHint(
    userId: string,
    phase: { kind: string; content: Record<string, unknown> },
    level: number,
  ): Promise<string> {
    const keys = await this.settings.getEncryptedKeys(userId);
    const isTechnical = level >= 4;
    const phaseContext = phase.kind === 'conceptual'
      ? `Pregunta conceptual: ${(phase.content as any).question}`
      : `Ejercicio de código: ${(phase.content as any).starter ?? ''}`;

    const prompt = `Eres Lumen, una mascota que ayuda a un estudiante principiante de programación.
El estudiante está atascado en: ${phaseContext}
Nivel de la pista solicitada: ${level}/5 (${isTechnical ? 'técnica' : 'conceptual'})

Da UNA pista breve (máximo 2 oraciones). ${isTechnical
  ? 'Puedes mencionar sintaxis o métodos concretos.'
  : 'Usa analogías del mundo real, no código.'
}
No resuelvas el ejercicio completo. Solo orienta.`;

    const response = await this.ai.generate(keys.googleKeyEnc, keys.openRouterKeyEnc, prompt);
    return response.text;
  }
}
