import {
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { RequireRoles } from '../common/decorators/roles.decorator';
import { RoleLevel } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // CSV: item, category, unit (flexível)
  @Post('upload/materials')
  @RequireRoles(RoleLevel.MANTENEDORA, RoleLevel.STAFF_CENTRAL, RoleLevel.DEVELOPER)
  @UseInterceptors(FileInterceptor('file', { storage: multer.memoryStorage() }))
  async uploadMaterials(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.adminService.importMaterialCatalogCsv(file, user);
  }

  // CSV REAL CEPI ARARA CANINDE: ALUNO, NASCIMENTO, TURMA, PROFESSORA
  // unitId opcional: se usuário não tiver unitId e a mantenedora tiver >1 unidade, você DEVE passar unitId
  @Post('upload/cepi-2026')
  @RequireRoles(RoleLevel.MANTENEDORA, RoleLevel.STAFF_CENTRAL, RoleLevel.DEVELOPER)
  @UseInterceptors(FileInterceptor('file', { storage: multer.memoryStorage() }))
  async uploadCepi2026(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: JwtPayload,
    @Query('unitId') unitId?: string,
  ) {
    return this.adminService.importCepi2026Csv(file, user, unitId);
  }
}
