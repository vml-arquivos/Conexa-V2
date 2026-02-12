import { Controller, Get, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequireRoles } from '../common/decorators/roles.decorator';
import { CacheTTL } from '@nestjs/cache-manager';
import { TenantCacheInterceptor } from '../cache/tenant-cache.interceptor';
import { LookupService } from './lookup.service';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { RoleLevel } from '@prisma/client';

@Controller('lookup')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LookupController {
  constructor(private readonly lookupService: LookupService) {}

  /**
   * GET /lookup/units/accessible
   * Retorna unidades acessíveis ao usuário
   */
  @Get('units/accessible')
  @RequireRoles(
    RoleLevel.DEVELOPER,
    RoleLevel.MANTENEDORA,
    RoleLevel.STAFF_CENTRAL,
    RoleLevel.UNIDADE,
    RoleLevel.PROFESSOR,
  )
  @UseInterceptors(TenantCacheInterceptor)
  @CacheTTL(300)
  async getAccessibleUnits(@CurrentUser() user: JwtPayload) {
    return this.lookupService.getAccessibleUnits(user);
  }

  /**
   * GET /lookup/classrooms/accessible?unitId=...
   * Retorna turmas acessíveis ao usuário
   */
  @Get('classrooms/accessible')
  @RequireRoles(
    RoleLevel.DEVELOPER,
    RoleLevel.MANTENEDORA,
    RoleLevel.STAFF_CENTRAL,
    RoleLevel.UNIDADE,
    RoleLevel.PROFESSOR,
  )
  @UseInterceptors(TenantCacheInterceptor)
  @CacheTTL(300)
  async getAccessibleClassrooms(
    @CurrentUser() user: JwtPayload,
    @Query('unitId') unitId?: string,
  ) {
    return this.lookupService.getAccessibleClassrooms(user, unitId);
  }

  /**
   * GET /lookup/teachers/accessible?unitId=...
   * Retorna professoras acessíveis (opcional)
   */
  @Get('teachers/accessible')
  @RequireRoles(
    RoleLevel.DEVELOPER,
    RoleLevel.MANTENEDORA,
    RoleLevel.STAFF_CENTRAL,
    RoleLevel.UNIDADE,
  )
  @UseInterceptors(TenantCacheInterceptor)
  @CacheTTL(300)
  async getAccessibleTeachers(
    @CurrentUser() user: JwtPayload,
    @Query('unitId') unitId?: string,
  ) {
    return this.lookupService.getAccessibleTeachers(user, unitId);
  }
}
