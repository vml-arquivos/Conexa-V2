import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { RequireRoles } from '../common/decorators/roles.decorator';
import { RoleLevel } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { MaterialRequestService } from './material-request.service';
import { CreateMaterialRequestDto } from './dto/create-material-request.dto';
import { ReviewMaterialRequestDto } from './dto/review-material-request.dto';

@Controller('material-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MaterialRequestController {
  constructor(private readonly svc: MaterialRequestService) {}

  /** Professor cria requisição — encaminhada à Coordenadora Pedagógica */
  @Post()
  @RequireRoles(RoleLevel.PROFESSOR, RoleLevel.DEVELOPER)
  create(@Body() dto: CreateMaterialRequestDto, @CurrentUser() user: JwtPayload) {
    return this.svc.create(dto, user);
  }

  /** Professor lista suas próprias requisições */
  @Get('minhas')
  @RequireRoles(RoleLevel.PROFESSOR, RoleLevel.DEVELOPER)
  listMine(@CurrentUser() user: JwtPayload) {
    return this.svc.listMine(user);
  }

  /** Coordenador/Direção lista todas as requisições da unidade */
  @Get()
  @RequireRoles(RoleLevel.UNIDADE, RoleLevel.DEVELOPER)
  list(@CurrentUser() user: JwtPayload) {
    return this.svc.list(user);
  }

  /** Coordenador aprova ou rejeita uma requisição */
  @Patch(':id/review')
  @RequireRoles(RoleLevel.UNIDADE, RoleLevel.DEVELOPER)
  review(
    @Param('id') id: string,
    @Body() dto: ReviewMaterialRequestDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.svc.review(id, dto, user);
  }
}
