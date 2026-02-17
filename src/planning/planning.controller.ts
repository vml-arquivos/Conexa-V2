import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Patch,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PlanningService } from './planning.service';
import { CreatePlanningDto } from './dto/create-planning.dto';
import { UpdatePlanningDto } from './dto/update-planning.dto';
import { ChangeStatusDto } from './dto/change-status.dto';
import { QueryPlanningDto } from './dto/query-planning.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ScopeGuard } from '../common/guards/scope.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@Controller('plannings')
@UseGuards(JwtAuthGuard, RolesGuard, ScopeGuard)
export class PlanningController {
  constructor(private readonly planningService: PlanningService) {}

  /**
   * POST /plannings/from-template
   * Cria um planejamento inteligente a partir de um template,
   * pré-preenchendo com dados da matriz curricular
   *
   * Body:
   * - templateId: ID do template
   * - classroomId: ID da turma
   * - date: Data do planejamento (ISO string)
   *
   * Acesso:
   * - Professor: pode criar planejamentos para suas turmas
   * - Coordenação/Direção: pode criar planejamentos na unidade
   * - Staff Central: pode criar planejamentos nas unidades vinculadas
   * - Mantenedora: pode criar planejamentos em qualquer unidade
   * - Developer: acesso total
   */
  @Post('from-template')
  @HttpCode(HttpStatus.CREATED)
  createFromTemplate(
    @Body() dto: { templateId: string; classroomId: string; date: string },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.planningService.createFromTemplate(dto, user);
  }

  /**
   * POST /plannings
   * Cria um novo planejamento
   *
   * Acesso:
   * - Coordenação/Direção: pode criar planejamentos na unidade
   * - Staff Central: pode criar planejamentos nas unidades vinculadas
   * - Mantenedora: pode criar planejamentos em qualquer unidade
   * - Developer: acesso total
   *
   * Regra: Professores NÃO podem criar planejamentos
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() createDto: CreatePlanningDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.planningService.create(createDto, user);
  }

  /**
   * GET /plannings
   * Lista planejamentos com filtros opcionais
   *
   * Query params:
   * - classroomId: Filtrar por turma
   * - unitId: Filtrar por unidade
   * - templateId: Filtrar por template
   * - status: Filtrar por status (DRAFT, ACTIVE, CLOSED)
   * - type: Filtrar por tipo (ANUAL, MENSAL, SEMANAL)
   * - startDate: Data inicial
   * - endDate: Data final
   *
   * Acesso:
   * - Professor: vê planejamentos das suas turmas
   * - Coordenação/Direção: vê planejamentos da unidade
   * - Staff Central: vê planejamentos das unidades vinculadas
   * - Mantenedora: vê todos os planejamentos
   * - Developer: acesso total
   */
  @Get()
  findAll(@Query() query: QueryPlanningDto, @CurrentUser() user: JwtPayload) {
    return this.planningService.findAll(query, user);
  }

  /**
   * GET /plannings/:id
   * Busca um planejamento específico por ID
   *
   * Acesso: Validado pelo service baseado no escopo do usuário
   */
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.planningService.findOne(id, user);
  }

  /**
   * PUT /plannings/:id
   * Atualiza um planejamento existente
   *
   * Acesso:
   * - Professor: pode editar planejamentos em DRAFT das suas turmas
   * - Coordenação/Direção: pode editar planejamentos da unidade
   * - Staff Central: pode editar planejamentos das unidades vinculadas
   * - Mantenedora: pode editar qualquer planejamento
   * - Developer: acesso total
   *
   * Regra: Planejamentos CLOSED não podem ser editados
   */
  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdatePlanningDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.planningService.update(id, updateDto, user);
  }

  /**
   * PATCH /plannings/:id/status
   * Altera o status de um planejamento
   *
   * Transições válidas:
   * - DRAFT → ACTIVE
   * - ACTIVE → CLOSED
   * - ACTIVE → DRAFT (voltar para rascunho)
   * - CLOSED → (não pode mudar)
   *
   * Acesso:
   * - Coordenação/Direção: pode alterar status
   * - Staff Central: pode alterar status
   * - Mantenedora: pode alterar status
   * - Developer: acesso total
   *
   * Regra: Professores NÃO podem ativar ou fechar planejamentos
   */
  @Patch(':id/status')
  changeStatus(
    @Param('id') id: string,
    @Body() changeStatusDto: ChangeStatusDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.planningService.changeStatus(id, changeStatusDto, user);
  }

  /**
   * PATCH /plannings/:id/close
   * Fecha um planejamento (EM_EXECUCAO → CONCLUIDO)
   *
   * Acesso:
   * - DEVELOPER
   * - MANTENEDORA
   * - STAFF_CENTRAL
   * - Professor: NÃO pode fechar
   *
   * Regra: Somente plannings com status EM_EXECUCAO podem ser fechados
   */
  @Patch(':id/close')
  close(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.planningService.close(id, user);
  }
}
