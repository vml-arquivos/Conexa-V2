import { Controller, Get, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { LookupService } from './lookup.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TenantCacheInterceptor } from '../cache/tenant-cache.interceptor';
import { CacheTTL } from '@nestjs/cache-manager';

interface UserPayload {
  userId: string;
  mantenedoraId: string;
  unitId: string | null;
  roleLevel: string;
}

@Controller('lookup')
@UseGuards(JwtAuthGuard)
@UseInterceptors(TenantCacheInterceptor)
@CacheTTL(300) // 5 minutos
export class LookupController {
  constructor(private readonly lookupService: LookupService) {}

  @Get('units/accessible')
  async getAccessibleUnits(@CurrentUser() user: UserPayload) {
    return this.lookupService.getAccessibleUnits(
      user.mantenedoraId,
      user.unitId,
      user.roleLevel as any,
    );
  }

  @Get('classrooms/accessible')
  async getAccessibleClassrooms(
    @CurrentUser() user: UserPayload,
    @Query('unitId') unitId?: string,
  ) {
    return this.lookupService.getAccessibleClassrooms(
      unitId,
      user.userId,
      user.roleLevel as any,
    );
  }

  @Get('teachers/accessible')
  async getAccessibleTeachers(@Query('unitId') unitId?: string) {
    return this.lookupService.getAccessibleTeachers(unitId);
  }
}
