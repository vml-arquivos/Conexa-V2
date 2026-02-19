import { Controller, Get, Param, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { LookupService } from './lookup.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TenantCacheInterceptor } from '../cache/tenant-cache.interceptor';
import { CacheTTL } from '@nestjs/cache-manager';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@Controller('lookup')
@UseGuards(JwtAuthGuard)
@UseInterceptors(TenantCacheInterceptor)
@CacheTTL(300) // 5 minutos
export class LookupController {
  constructor(private readonly lookupService: LookupService) {}

  @Get('units/accessible')
  async getAccessibleUnits(@CurrentUser() user: JwtPayload) {
    return this.lookupService.getAccessibleUnits(user);
  }

  @Get('classrooms/accessible')
  async getAccessibleClassrooms(
    @CurrentUser() user: JwtPayload,
    @Query('unitId') unitId?: string,
  ) {
    return this.lookupService.getAccessibleClassrooms(user, unitId);
  }

  @Get('teachers/accessible')
  async getAccessibleTeachers(@Query('unitId') unitId?: string) {
    return this.lookupService.getAccessibleTeachers(unitId);
  }

  /**
   * GET /lookup/children/accessible?classroomId=xxx
   * Retorna crianças matriculadas na turma (acessíveis ao usuário)
   */
  @Get('children/accessible')
  async getAccessibleChildren(
    @CurrentUser() user: JwtPayload,
    @Query('classroomId') classroomId?: string,
  ) {
    return this.lookupService.getAccessibleChildren(user, classroomId);
  }

  /**
   * GET /lookup/classrooms/:id/children
   * Endpoint alternativo para crianças por turma
   */
  @Get('classrooms/:id/children')
  async getChildrenByClassroom(
    @Param('id') classroomId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.lookupService.getChildrenByClassroom(classroomId, user);
  }
}
