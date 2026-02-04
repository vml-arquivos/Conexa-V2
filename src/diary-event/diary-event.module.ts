import { Module } from '@nestjs/common';
import { DiaryEventService } from './diary-event.service';
import { DiaryEventController } from './diary-event.controller';
import { AuditService } from '../common/services/audit.service';

@Module({
  controllers: [DiaryEventController],
  providers: [DiaryEventService, AuditService],
  exports: [DiaryEventService],
})
export class DiaryEventModule {}
