import {
  Controller,
  Get,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { DashboardsService } from './dashboards.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { RequireRoles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';

@Controller('reports/dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(CacheInterceptor)
export class DashboardsController {
  constructor(private readonly dashboardsService: DashboardsService) {}

  /**
   * GET /reports/dashboard/mantenedora
   * Dashboard da Mantenedora - KPIs globais
   *
   * RBAC:
   * - MANTENEDORA, DEVELOPER: acesso
   * - Outros: negado
   *
   * Cache: 300s (5 minutos)
   */
  @Get('mantenedora')
  @RequireRoles('MANTENEDORA', 'DEVELOPER')
  @CacheTTL(300)
  getMantenedoraStats(@CurrentUser() user: JwtPayload) {
    return this.dashboardsService.getMantenedoraStats(user);
  }

  /**
   * GET /reports/dashboard/unit
   * Dashboard da Unidade - KPIs operacionais e pedagógicos
   *
   * RBAC:
   * - UNIDADE, STAFF_CENTRAL, MANTENEDORA, DEVELOPER: acesso
   * - PROFESSOR: negado
   *
   * Cache: 300s (5 minutos)
   */
  @Get('unit')
  @RequireRoles('UNIDADE', 'STAFF_CENTRAL', 'MANTENEDORA', 'DEVELOPER')
  @CacheTTL(300)
  getUnitDashboard(
    @Query('unitId') unitId: string | undefined,
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.dashboardsService.getUnitDashboard(user, unitId, from, to);
  }

  /**
   * GET /reports/dashboard/teacher
   * Dashboard do Professor - KPIs por turma no dia
   *
   * RBAC:
   * - PROFESSOR: acesso (suas turmas)
   * - UNIDADE, STAFF_CENTRAL, MANTENEDORA, DEVELOPER: acesso (requer classroomId)
   *
   * Cache: 300s (5 minutos)
   */
  @Get('teacher')
  @RequireRoles(
    'PROFESSOR',
    'UNIDADE',
    'STAFF_CENTRAL',
    'MANTENEDORA',
    'DEVELOPER',
  )
  @CacheTTL(300)
  getTeacherDashboard(
    @Query('date') date: string | undefined,
    @Query('classroomId') classroomId: string | undefined,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.dashboardsService.getTeacherDashboard(user, date, classroomId);
  }
}
