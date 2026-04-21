import { Module } from '@nestjs/common';
import { HintsController } from './hints.controller';
import { HintsService } from './hints.service';
import { AiProviderModule } from '../ai-provider/ai-provider.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [AiProviderModule, SettingsModule],
  controllers: [HintsController],
  providers: [HintsService],
})
export class HintsModule {}
