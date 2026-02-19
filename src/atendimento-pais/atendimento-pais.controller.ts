import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { RequireRoles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { AtendimentoPaisService } from './atendimento-pais.service';
import { CreateAtendimentoDto } from './dto/create-atendimento.dto';
import { RoleLevel, StatusAtendimento } from '@prisma/client';

@Controller('atendimentos-pais')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AtendimentoPaisController {
  constructor(private readonly svc: AtendimentoPaisService) {}

  /**
   * POST /atendimentos-pais
   * Registra um novo atendimento com pais/responsáveis
   * RBAC: PROFESSOR, UNIDADE, STAFF_CENTRAL, MANTENEDORA, DEVELOPER
   */
  @Post()
  @RequireRoles(
    RoleLevel.PROFESSOR,
    RoleLevel.UNIDADE,
    RoleLevel.STAFF_CENTRAL,
    RoleLevel.MANTENEDORA,
    RoleLevel.DEVELOPER,
  )
  criar(@Body() dto: CreateAtendimentoDto, @CurrentUser() user: JwtPayload) {
    return this.svc.criar(dto, user);
  }

  /**
   * GET /atendimentos-pais
   * Lista atendimentos com filtros opcionais
   * RBAC: PROFESSOR (próprios), UNIDADE, STAFF_CENTRAL, MANTENEDORA, DEVELOPER
   */
  @Get()
  @RequireRoles(
    RoleLevel.PROFESSOR,
    RoleLevel.UNIDADE,
    RoleLevel.STAFF_CENTRAL,
    RoleLevel.MANTENEDORA,
    RoleLevel.DEVELOPER,
  )
  listar(
    @CurrentUser() user: JwtPayload,
    @Query('childId') childId?: string,
    @Query('status') status?: StatusAtendimento,
    @Query('unitId') unitId?: string,
  ) {
    return this.svc.listar(user, { childId, status, unitId });
  }

  /**
   * PATCH /atendimentos-pais/:id/status
   * Atualiza o status de um atendimento
   * RBAC: UNIDADE, STAFF_CENTRAL, MANTENEDORA, DEVELOPER
   */
  @Patch(':id/status')
  @RequireRoles(
    RoleLevel.UNIDADE,
    RoleLevel.STAFF_CENTRAL,
    RoleLevel.MANTENEDORA,
    RoleLevel.DEVELOPER,
  )
  atualizarStatus(
    @Param('id') id: string,
    @Body() body: { status: StatusAtendimento },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.svc.atualizarStatus(id, body.status, user);
  }
}
