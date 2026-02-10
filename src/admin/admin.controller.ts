import { Controller, Post, UploadedFile, UseGuards, UseInterceptors, Request } from '@nestjs/common';
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

  @Post('upload/structure')
  @RequireRoles(RoleLevel.MANTENEDORA, RoleLevel.DEVELOPER)
  @UseInterceptors(FileInterceptor('file', { storage: multer.memoryStorage() }))
  async uploadStructure(@UploadedFile() file: Express.Multer.File, @Request() req) {
    return this.adminService.importStructureCsv(file, req.user);
  }
}
