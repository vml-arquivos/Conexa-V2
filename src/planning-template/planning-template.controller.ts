import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PlanningTemplateService } from './planning-template.service';
import { CreatePlanningTemplateDto } from './dto/create-planning-template.dto';
import { UpdatePlanningTemplateDto } from './dto/update-planning-template.dto';
import { QueryPlanningTemplateDto } from './dto/query-planning-template.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ScopeGuard } from '../common/guards/scope.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@Controller('planning-templates')
@UseGuards(JwtAuthGuard, RolesGuard, ScopeGuard)
export class PlanningTemplateController {
  constructor(
    private readonly planningTemplateService: PlanningTemplateService,
  ) {}

  /**
   * POST /planning-templates
   * Cria um novo template de planejamento
   *
   * Acesso:
   * - Mantenedora: pode criar templates
   * - Staff Central (Coordenação Geral): pode criar templates
   * - Developer: acesso total
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() createDto: CreatePlanningTemplateDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.planningTemplateService.create(createDto, user);
  }

  /**
   * GET /planning-templates
   * Lista templates com filtros opcionais
   *
   * Query params:
   * - mantenedoraId: Filtrar por mantenedora
   * - type: Filtrar por tipo (ANUAL, MENSAL, SEMANAL)
   * - search: Buscar por nome ou descrição
   *
   * Acesso: Todos os usuários autenticados (filtrado por escopo)
   */
  /**
   * GET /planning-templates/cocris-defaults
   * Retorna templates padrão COCRIS (sempre 200, nunca 404)
   *
   * Acesso: Todos os usuários autenticados
   */
  @Get('cocris-defaults')
  getCocrisDefaults() {
    return this.planningTemplateService.getCocrisDefaults();
  }

  @Get()
  findAll(
    @Query() query: QueryPlanningTemplateDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.planningTemplateService.findAll(query, user);
  }

  /**
   * GET /planning-templates/:id
   * Busca um template específico por ID
   *
   * Acesso: Validado pelo service baseado no escopo do usuário
   */
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.planningTemplateService.findOne(id, user);
  }

  /**
   * PUT /planning-templates/:id
   * Atualiza um template existente
   *
   * Acesso:
   * - Mantenedora: pode editar templates da mantenedora
   * - Staff Central: pode editar templates que criou
   * - Developer: acesso total
   */
  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdatePlanningTemplateDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.planningTemplateService.update(id, updateDto, user);
  }

  /**
   * DELETE /planning-templates/:id
   * Remove um template (soft delete)
   *
   * Acesso:
   * - Mantenedora: pode deletar templates da mantenedora
   * - Staff Central: pode deletar templates que criou
   * - Developer: acesso total
   *
   * Regra: Não pode deletar templates com planejamentos vinculados
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.planningTemplateService.remove(id, user);
  }
}
