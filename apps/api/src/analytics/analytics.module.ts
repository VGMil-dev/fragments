import { Module } from '@nestjs/common';
import { AnalyticsGateway } from './analytics.gateway';

@Module({
  providers: [AnalyticsGateway],
  exports: [AnalyticsGateway],
})
export class AnalyticsModule {}
