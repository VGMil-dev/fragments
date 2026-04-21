import { Module } from '@nestjs/common';
import { AiProviderService } from './ai-provider.service';
import { EncryptionService } from './encryption.service';

@Module({
  providers: [AiProviderService, EncryptionService],
  exports: [AiProviderService],
})
export class AiProviderModule {}
