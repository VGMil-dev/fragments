import { Module } from '@nestjs/common';
import { AiProviderService } from './ai-provider.service';
import { EncryptionService } from './encryption.service';

@Module({
  providers: [AiProviderService, EncryptionService],
  exports: [AiProviderService, EncryptionService],
})
export class AiProviderModule {}
