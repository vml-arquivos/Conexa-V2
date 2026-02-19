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
import { CacheTTL } from '@nestjs/cache-manager';
import { TenantCacheInterceptor } from '../cache/tenant-cache.interceptor';

@Controller('reports/dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(TenantCacheInterceptor)
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
    @Query('unitId') unitId: string | undefined,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.dashboardsService.getTeacherDashboard(user, date, classroomId, unitId);
  }
}

/**
 * Controller separado para /dashboard/central
 * Compatibilidade com o DashboardCentralPage do frontend
 */
import { Controller as NestController } from '@nestjs/common';

@NestController('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(TenantCacheInterceptor)
export class DashboardCentralController {
  constructor(private readonly dashboardsService: DashboardsService) {}

  /**
   * GET /dashboard/central
   * Dashboard Central (Bruna/Carla) — análises consolidadas
   * Delega para getMantenedoraStats com dados expandidos
   */
  @Get('central')
  @RequireRoles('STAFF_CENTRAL', 'MANTENEDORA', 'DEVELOPER')
  @CacheTTL(300)
  getDashboardCentral(
    @Query('unidadeId') unidadeId: string | undefined,
    @Query('periodo') periodo: string | undefined,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.dashboardsService.getDashboardCentral(user, unidadeId, periodo);
  }
}
