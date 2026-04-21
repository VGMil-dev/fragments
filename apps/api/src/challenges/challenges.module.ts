import { Module } from '@nestjs/common';
import { ChallengesController } from './challenges.controller';
import { ChallengesService } from './challenges.service';
import { SubmissionController } from './submission.controller';
import { SubmissionService } from './submission.service';
import { PistonService } from './piston.service';
import { PhaseEvaluatorService } from './phase-evaluator.service';
import { SettingsModule } from '../settings/settings.module';
import { AiProviderModule } from '../ai-provider/ai-provider.module';

@Module({
  imports: [SettingsModule, AiProviderModule],
  controllers: [ChallengesController, SubmissionController],
  providers: [
    ChallengesService,
    SubmissionService,
    PistonService,
    PhaseEvaluatorService,
  ],
  exports: [ChallengesService],
})
export class ChallengesModule {}
