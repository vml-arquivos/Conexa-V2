import {
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Request,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';

import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { RequireRoles } from '../common/decorators/roles.decorator';
import { RoleLevel } from '@prisma/client';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  /**
   * Importa estrutura CEPI 2026:
   * colunas: ALUNO, NASCIMENTO, TURMA, PROFESSORA
   *
   * Multi-tenant:
   * - Se JWT tiver unitId -> usa.
   * - Se JWT não tiver unitId -> exigir ?unitId=...
   */
  @Post('upload/structure')
  @RequireRoles(RoleLevel.MANTENEDORA, RoleLevel.UNIDADE, RoleLevel.DEVELOPER)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: multer.memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async uploadStructure(
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
    @Query('unitId') unitId?: string,
  ) {
    return this.adminService.importStructureCsv(file, req.user, unitId);
  }
}
