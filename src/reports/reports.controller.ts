import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { RequireRoles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  /**
   * GET /reports/diary/by-classroom
   * Relatório de diário por turma
   *
   * RBAC:
   * - DEVELOPER, MANTENEDORA, STAFF_CENTRAL: acesso total
   * - PROFESSOR: somente da própria turma
   */
  @Get('diary/by-classroom')
  getDiaryByClassroom(
    @Query('classroomId') classroomId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.reportsService.getDiaryByClassroom(
      classroomId,
      startDate,
      endDate,
      user,
    );
  }

  /**
   * GET /reports/diary/by-period
   * Relatório de diário por período
   *
   * RBAC:
   * - DEVELOPER, MANTENEDORA, STAFF_CENTRAL: acesso
   * - PROFESSOR: negado
   */
  @Get('diary/by-period')
  @RequireRoles('DEVELOPER', 'MANTENEDORA', 'STAFF_CENTRAL')
  getDiaryByPeriod(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.reportsService.getDiaryByPeriod(startDate, endDate, user);
  }

  /**
   * GET /reports/diary/unplanned
   * Relatório de eventos sem planning
   *
   * RBAC:
   * - DEVELOPER, MANTENEDORA, STAFF_CENTRAL: acesso
   * - PROFESSOR: negado
   */
  @Get('diary/unplanned')
  @RequireRoles('DEVELOPER', 'MANTENEDORA', 'STAFF_CENTRAL')
  getUnplannedDiaryEvents(@CurrentUser() user: JwtPayload) {
    return this.reportsService.getUnplannedDiaryEvents(user);
  }


}
