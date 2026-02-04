import { Module } from '@nestjs/common';
import { PlanningTemplateService } from './planning-template.service';
import { PlanningTemplateController } from './planning-template.controller';
import { AuditService } from '../common/services/audit.service';

@Module({
  controllers: [PlanningTemplateController],
  providers: [PlanningTemplateService, AuditService],
  exports: [PlanningTemplateService],
})
export class PlanningTemplateModule {}
