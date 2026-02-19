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
  UseInterceptors,
} from '@nestjs/common';
import { CacheTTL } from '@nestjs/cache-manager';
import { TenantCacheInterceptor } from '../cache/tenant-cache.interceptor';
import { MatrixCacheInterceptor } from '../cache/matrix-cache.interceptor';
import { CurriculumMatrixEntryService } from './curriculum-matrix-entry.service';
import { CreateCurriculumMatrixEntryDto } from './dto/create-curriculum-matrix-entry.dto';
import { UpdateCurriculumMatrixEntryDto } from './dto/update-curriculum-matrix-entry.dto';
import { QueryCurriculumMatrixEntryDto } from './dto/query-curriculum-matrix-entry.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ScopeGuard } from '../common/guards/scope.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequireRoles } from '../common/decorators/roles.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@Controller('curriculum-matrix-entries')
@UseGuards(JwtAuthGuard, RolesGuard, ScopeGuard)
export class CurriculumMatrixEntryController {
  constructor(
    private readonly curriculumMatrixEntryService: CurriculumMatrixEntryService,
  ) {}

  @Post()
  @RequireRoles('DEVELOPER', 'MANTENEDORA', 'STAFF_CENTRAL')
  create(
    @Body() createDto: CreateCurriculumMatrixEntryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.curriculumMatrixEntryService.create(createDto, user);
  }

  @Get()
  @CacheTTL(86400) // 24h para matriz curricular (read-heavy, muda raramente)
  @UseInterceptors(MatrixCacheInterceptor)
  findAll(@Query() query: QueryCurriculumMatrixEntryDto, @CurrentUser() user: JwtPayload) {
    return this.curriculumMatrixEntryService.findAll(query, user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.curriculumMatrixEntryService.findOne(id, user);
  }

  @Patch(':id')
  @RequireRoles('DEVELOPER', 'MANTENEDORA', 'STAFF_CENTRAL')
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateCurriculumMatrixEntryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.curriculumMatrixEntryService.update(id, updateDto, user);
  }

  @Delete(':id')
  @RequireRoles('DEVELOPER', 'MANTENEDORA')
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.curriculumMatrixEntryService.remove(id, user);
  }
}
