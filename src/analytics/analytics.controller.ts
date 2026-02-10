import { Controller, Get, Query, UseInterceptors } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { RequireRoles } from '../common/decorators/roles.decorator';
import { RoleLevel } from '@prisma/client';
import { AuditDashboardAccessInterceptor } from '../common/interceptors/audit-dashboard-access.interceptor';

@Controller()
@UseInterceptors(AuditDashboardAccessInterceptor)
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  // MANTENEDORA (admin)
  @Get('/admin/global-stats')
  @RequireRoles(RoleLevel.MANTENEDORA, RoleLevel.DEVELOPER)
  async globalStats(@CurrentUser() user: JwtPayload) {
    return this.analytics.getGlobalStats(user);
  }

  // UNIDADE/DIRETOR
  @Get('/unit/dashboard')
  @RequireRoles(RoleLevel.UNIDADE, RoleLevel.STAFF_CENTRAL, RoleLevel.MANTENEDORA, RoleLevel.DEVELOPER)
  async unitDashboard(@CurrentUser() user: JwtPayload) {
    return this.analytics.getUnitDashboard(user);
  }

  // NUTRIÇÃO
  @Get('/nutrition/report')
  @RequireRoles(RoleLevel.UNIDADE, RoleLevel.STAFF_CENTRAL, RoleLevel.MANTENEDORA, RoleLevel.DEVELOPER)
  async nutrition(@CurrentUser() user: JwtPayload) {
    return this.analytics.getNutritionReport(user);
  }

  // PROFESSOR
  @Get('/classroom/daily-summary')
  @RequireRoles(RoleLevel.PROFESSOR, RoleLevel.UNIDADE, RoleLevel.DEVELOPER)
  async classroomDaily(
    @CurrentUser() user: JwtPayload,
    @Query('classroomId') classroomId: string,
    @Query('date') date?: string,
  ) {
    return this.analytics.getClassroomDailySummary(user, classroomId, date);
  }
}
