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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { DiaryEventService } from './diary-event.service';
import { CreateDiaryEventDto } from './dto/create-diary-event.dto';
import { UpdateDiaryEventDto } from './dto/update-diary-event.dto';
import { QueryDiaryEventDto } from './dto/query-diary-event.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ScopeGuard } from '../common/guards/scope.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@Controller('diary-events')
@UseGuards(JwtAuthGuard, RolesGuard, ScopeGuard)
export class DiaryEventController {
  constructor(private readonly diaryEventService: DiaryEventService) {}

  /**
   * POST /diary-events
   * Cria um novo evento no diário de bordo
   *
   * Acesso:
   * - Professor: pode criar eventos nas suas turmas
   * - Coordenação/Direção: pode criar eventos na unidade
   * - Staff Central: pode criar eventos nas unidades vinculadas
   * - Mantenedora: pode criar eventos em qualquer unidade
   * - Developer: acesso total
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() createDiaryEventDto: CreateDiaryEventDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.diaryEventService.create(createDiaryEventDto, user);
  }

  /**
   * GET /diary-events
   * Lista eventos com filtros opcionais
   *
   * Query params:
   * - childId: Filtrar por criança
   * - classroomId: Filtrar por turma
   * - unitId: Filtrar por unidade
   * - type: Filtrar por tipo de evento
   * - startDate: Data inicial (ISO 8601)
   * - endDate: Data final (ISO 8601)
   * - createdBy: Filtrar por autor
   *
   * Acesso:
   * - Professor: vê apenas eventos das suas turmas
   * - Coordenação/Direção: vê eventos da unidade
   * - Staff Central: vê eventos das unidades vinculadas
   * - Mantenedora: vê todos os eventos
   * - Developer: acesso total
   */
  @Get()
  findAll(@Query() query: QueryDiaryEventDto, @CurrentUser() user: JwtPayload) {
    return this.diaryEventService.findAll(query, user);
  }

  /**
   * GET /diary-events/:id
   * Busca um evento específico por ID
   *
   * Acesso: Validado pelo service baseado no escopo do usuário
   */
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.diaryEventService.findOne(id, user);
  }

  /**
   * PATCH /diary-events/:id
   * Atualiza um evento existente
   *
   * Acesso:
   * - Criador do evento pode editar
   * - Coordenação/Direção pode editar eventos da unidade
   * - Mantenedora pode editar qualquer evento
   * - Developer: acesso total
   */
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateDiaryEventDto: UpdateDiaryEventDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.diaryEventService.update(id, updateDiaryEventDto, user);
  }

  /**
   * DELETE /diary-events/:id
   * Remove um evento (soft delete)
   *
   * Acesso:
   * - Criador do evento pode deletar
   * - Coordenação/Direção pode deletar eventos da unidade
   * - Mantenedora pode deletar qualquer evento
   * - Developer: acesso total
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.diaryEventService.remove(id, user);
  }
}
