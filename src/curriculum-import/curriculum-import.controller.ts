import { Controller, Post, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ScopeGuard } from '../common/guards/scope.guard';
import { RequireRoles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { RoleLevel } from '@prisma/client';
import { CurriculumImportService } from './curriculum-import.service';
import { ImportCurriculumDto, ImportMatrixDto } from './dto/import-curriculum.dto';

@Controller('curriculum-matrices')
@UseGuards(JwtAuthGuard, RolesGuard, ScopeGuard)
export class CurriculumImportController {
  constructor(private readonly importService: CurriculumImportService) {}

  /**
   * Dry-run: Simula a importação sem gravar no banco
   * 
   * POST /curriculum-matrices/import/dry-run
   * 
   * RBAC: Apenas MANTENEDORA e STAFF_CENTRAL
   */
  @Post('import/dry-run')
  @RequireRoles(RoleLevel.MANTENEDORA, RoleLevel.STAFF_CENTRAL)
  async importDryRun(
    @Body() dto: ImportCurriculumDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.importService.importDryRun(dto, user);
  }

  /**
   * Apply: Importa a matriz curricular do PDF para o banco
   * 
   * POST /curriculum-matrices/:id/import/pdf
   * 
   * RBAC: Apenas MANTENEDORA e STAFF_CENTRAL
   */
  @Post(':id/import/pdf')
  @RequireRoles(RoleLevel.MANTENEDORA, RoleLevel.STAFF_CENTRAL)
  async importApply(
    @Param('id') matrixId: string,
    @Body() dto: ImportMatrixDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.importService.importApply(matrixId, dto, user);
  }
}
