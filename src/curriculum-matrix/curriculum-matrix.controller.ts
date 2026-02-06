import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurriculumMatrixService } from './curriculum-matrix.service';
import { CreateCurriculumMatrixDto } from './dto/create-curriculum-matrix.dto';
import { UpdateCurriculumMatrixDto } from './dto/update-curriculum-matrix.dto';
import { QueryCurriculumMatrixDto } from './dto/query-curriculum-matrix.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ScopeGuard } from '../common/guards/scope.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequireRoles } from '../common/decorators/roles.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@Controller('curriculum-matrices')
@UseGuards(JwtAuthGuard, RolesGuard, ScopeGuard)
export class CurriculumMatrixController {
  constructor(private readonly curriculumMatrixService: CurriculumMatrixService) {}

  @Post()
  @RequireRoles('DEVELOPER', 'MANTENEDORA', 'STAFF_CENTRAL')
  create(
    @Body() createDto: CreateCurriculumMatrixDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.curriculumMatrixService.create(createDto, user);
  }

  @Get()
  findAll(@Query() query: QueryCurriculumMatrixDto, @CurrentUser() user: JwtPayload) {
    return this.curriculumMatrixService.findAll(query, user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.curriculumMatrixService.findOne(id, user);
  }

  @Patch(':id')
  @RequireRoles('DEVELOPER', 'MANTENEDORA', 'STAFF_CENTRAL')
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateCurriculumMatrixDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.curriculumMatrixService.update(id, updateDto, user);
  }

  @Delete(':id')
  @RequireRoles('DEVELOPER', 'MANTENEDORA')
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.curriculumMatrixService.remove(id, user);
  }

  @Get(':id/import/status')
  @RequireRoles('DEVELOPER', 'MANTENEDORA', 'STAFF_CENTRAL')
  getImportStatus(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.curriculumMatrixService.getImportStatus(id, user);
  }
}
