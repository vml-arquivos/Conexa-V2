import { Module } from '@nestjs/common';
import { PlanningService } from './planning.service';
import { PlanningController } from './planning.controller';
import { AuditService } from '../common/services/audit.service';

@Module({
  controllers: [PlanningController],
  providers: [PlanningService, AuditService],
  exports: [PlanningService],
})
export class PlanningModule {}
