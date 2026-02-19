import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { DashboardsController, DashboardCentralController } from './dashboards.controller';
import { DashboardsService } from './dashboards.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditService } from '../common/services/audit.service';

@Module({
  imports: [PrismaModule],
  controllers: [ReportsController, DashboardsController, DashboardCentralController],
  providers: [ReportsService, DashboardsService, AuditService],
})
export class ReportsModule {}
