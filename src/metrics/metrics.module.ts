import { Module } from '@nestjs/common';
import { MetricsListener } from './metrics.listener';

@Module({
  providers: [MetricsListener],
})
export class MetricsModule {}
