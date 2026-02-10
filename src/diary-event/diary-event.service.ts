import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/services/audit.service';
import { CreateDiaryEventDto } from './dto/create-diary-event.dto';
import { UpdateDiaryEventDto } from './dto/update-diary-event.dto';
import { QueryDiaryEventDto } from './dto/query-diary-event.dto';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { RoleLevel, PlanningStatus, AuditLogEntity } from '@prisma/client';
import {
  getPedagogicalDay,
  isSamePedagogicalDay,
  formatPedagogicalDate,
} from '../common/utils/date.utils';
import { getScopedWhereForDiaryEvent } from './diary-event-scope.helper';

@Injectable()
export class DiaryEventService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Cria um novo evento no diário de bordo
   * Travas (Sprint 1):
   * - Não permitir datas futuras (dia pedagógico - America/Sao_Paulo)
   * - Bloquear retroatividade sem planejamento aprovado
   * - eventDate deve coincidir com CurriculumMatrixEntry.date (dia pedagógico)
   * - Segmento (EI01/EI02/EI03) compatível com CurriculumMatrix.segment
   * - Auditoria automática (DIARY_EVENT / CREATE)
   */
  async create(createDto: CreateDiaryEventDto, user: JwtPayload) {
    // Normalizar datas por "dia pedagógico" (America/Sao_Paulo)
    const eventDate = new Date(createDto.eventDate);
    const todayPed = getPedagogicalDay(new Date());
    const eventPed = getPedagogicalDay(eventDate);

    // TRAVA: Bloquear datas futuras
    if (eventPed > todayPed) {
      throw new BadRequestException(
        `Não é permitido registrar eventos em datas futuras (${formatPedagogicalDate(eventDate)}).`,
      );
    }

    // Validar se a criança existe e pertence à turma
    const child = await this.prisma.child.findUnique({
      where: { id: createDto.childId },
      include: {
        enrollments: {
          where: {
            classroomId: createDto.classroomId,
            status: 'ATIVA',
          },
        },
      },
    });

    if (!child) {
      throw new NotFoundException('Criança não encontrada');
    }

    if (child.enrollments.length === 0) {
      throw new BadRequestException('Criança não está matriculada nesta turma');
    }

    // Validar se a turma existe
    const classroom = await this.prisma.classroom.findUnique({
      where: { id: createDto.classroomId },
      include: {
        unit: {
          select: {
            id: true,
            mantenedoraId: true,
          },
        },
      },
    });

    if (!classroom) {
      throw new NotFoundException('Turma não encontrada');
    }

    // HARDENING: Validação explícita de acesso por nível hierárquico
    await this.validateUserAccess(user, classroom);

    // VALIDAÇÃO CRÍTICA 1: Planning obrigatório
    const planning = await this.prisma.planning.findUnique({
      where: { id: createDto.planningId },
      include: {
        classroom: true,
        curriculumMatrix: true,
      },
    });

    if (!planning) {
      throw new NotFoundException('Planejamento não encontrado');
    }

    // TRAVA retroatividade (datas passadas exigem planejamento aprovado; hoje exige execução)
    if (planning.status === PlanningStatus.CANCELADO) {
      throw new BadRequestException('Planejamento cancelado não pode receber eventos');
    }

    if (eventPed < todayPed) {
      const approvedStatuses: PlanningStatus[] = [
        PlanningStatus.PUBLICADO,
        PlanningStatus.EM_EXECUCAO,
        PlanningStatus.CONCLUIDO,
      ];
      if (!approvedStatuses.includes(planning.status)) {
        throw new BadRequestException(
          `Registro retroativo bloqueado: ${formatPedagogicalDate(eventDate)} requer planejamento aprovado. Status atual: ${planning.status}`,
        );
      }
    } else {
      // Hoje: exige planejamento em execução (ativo)
      if (planning.status !== PlanningStatus.EM_EXECUCAO) {
        throw new BadRequestException(
          `Apenas planejamentos ativos podem receber eventos. Status atual: ${planning.status}`,
        );
      }
    }

    // VALIDAÇÃO CRÍTICA 2: Data do evento dentro do período do Planning
    const planningStart = new Date(planning.startDate);
    const planningEnd = new Date(planning.endDate);

    if (eventDate < planningStart || eventDate > planningEnd) {
      throw new BadRequestException(
        `A data do evento (${formatPedagogicalDate(eventDate)}) deve estar dentro do período do planejamento (${formatPedagogicalDate(planningStart)} - ${formatPedagogicalDate(planningEnd)})`,
      );
    }

    // VALIDAÇÃO CRÍTICA 3: Planning deve pertencer à mesma turma
    if (planning.classroomId !== createDto.classroomId) {
      throw new BadRequestException('O planejamento não pertence à turma informada');
    }

    // VALIDAÇÃO CRÍTICA 4: CurriculumEntry obrigatório
    const entry = await this.prisma.curriculumMatrixEntry.findUnique({
      where: { id: createDto.curriculumEntryId },
      include: { matrix: true },
    });

    if (!entry) {
      throw new NotFoundException('Entrada da matriz curricular não encontrada');
    }

    // VALIDAÇÃO CRÍTICA 5: Data do evento deve corresponder à data da entrada (dia pedagógico)
    const entryDate = new Date(entry.date);
    if (!isSamePedagogicalDay(eventDate, entryDate)) {
      throw new BadRequestException(
        `A data do evento (${formatPedagogicalDate(eventDate)}) não corresponde à data da entrada da matriz (${formatPedagogicalDate(entryDate)})`,
      );
    }

    // VALIDAÇÃO CRÍTICA 6: CurriculumEntry deve pertencer à matriz do Planning (quando aplicável)
    if (planning.curriculumMatrixId && entry.matrixId !== planning.curriculumMatrixId) {
      throw new BadRequestException(
        'A entrada da matriz não pertence à matriz curricular do planejamento',
      );
    }

    // VALIDAÇÃO CRÍTICA 7: Segmento (Turma/Idade) compatível com a matriz (EI01/EI02/EI03)
    const ageMonths = this.diffInMonths(child.dateOfBirth, eventDate);
    if (ageMonths < classroom.ageGroupMin || ageMonths > classroom.ageGroupMax) {
      throw new BadRequestException(
        `Segmento incompatível: criança com ${ageMonths} meses fora do intervalo da turma (${classroom.ageGroupMin}-${classroom.ageGroupMax} meses).`,
      );
    }

    const expectedSegment = this.inferSegmentFromClassroom(
      classroom.ageGroupMin,
      classroom.ageGroupMax,
    );
    const matrixSegment = String(entry.matrix.segment || '').toUpperCase();

    if (matrixSegment && matrixSegment !== expectedSegment) {
      throw new BadRequestException(
        `Segmento incompatível: turma=${expectedSegment} mas matriz=${matrixSegment}.`,
      );
    }

    // Criar o evento
    const diaryEvent = await this.prisma.diaryEvent.create({
      data: {
        type: createDto.type,
        title: createDto.title,
        description: createDto.description,
        eventDate,
        childId: createDto.childId,
        classroomId: createDto.classroomId,
        planningId: createDto.planningId,
        curriculumEntryId: createDto.curriculumEntryId,

        // Micro-gestos (JSONB / estruturados)
        medicaoAlimentar: createDto.medicaoAlimentar ?? undefined,
        sonoMinutos: createDto.sonoMinutos ?? undefined,
        trocaFraldaStatus: createDto.trocaFraldaStatus ?? undefined,

        tags: createDto.tags || [],
        aiContext: createDto.aiContext || {},
        mediaUrls: createDto.mediaUrls || [],
        createdBy: user.sub,
        mantenedoraId: classroom.unit.mantenedoraId,
        unitId: classroom.unitId,
      },
      include: {
        child: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        classroom: {
          select: {
            id: true,
            name: true,
          },
        },
        createdByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Auditoria automática (Entity: DIARY_EVENT, Action: CREATE)
    await this.auditService.logCreate(
      AuditLogEntity.DIARY_EVENT,
      diaryEvent.id,
      user.sub,
      classroom.unit.mantenedoraId,
      classroom.unitId,
      diaryEvent,
    );

    return diaryEvent;
  }

  /**
   * Lista eventos com filtros
   */
  async findAll(query: QueryDiaryEventDto, user: JwtPayload) {
    const where: any = {};

    // Filtro por escopo do usuário
    if (!user.roles.some((role) => role.level === RoleLevel.DEVELOPER)) {
      // Mantenedora: acessa tudo da mantenedora
      if (user.roles.some((role) => role.level === RoleLevel.MANTENEDORA)) {
        where.mantenedoraId = user.mantenedoraId;
      }
      // Staff Central: acessa apenas unidades vinculadas
      else if (
        user.roles.some((role) => role.level === RoleLevel.STAFF_CENTRAL)
      ) {
        const staffRole = user.roles.find(
          (role) => role.level === RoleLevel.STAFF_CENTRAL,
        );
        where.unitId = { in: staffRole?.unitScopes || [] };
      }
      // Unidade: acessa apenas sua unidade
      else if (user.roles.some((role) => role.level === RoleLevel.UNIDADE)) {
        where.unitId = user.unitId;
      }
      // Professor: acessa apenas suas turmas
      else if (user.roles.some((role) => role.level === RoleLevel.PROFESSOR)) {
        const classrooms = await this.prisma.classroomTeacher.findMany({
          where: {
            teacherId: user.sub,
            isActive: true,
          },
          select: { classroomId: true },
        });
        where.classroomId = { in: classrooms.map((ct) => ct.classroomId) };
      }
    }

    // Aplicar filtros da query
    if (query.childId) {
      where.childId = query.childId;
    }

    if (query.classroomId) {
      where.classroomId = query.classroomId;
    }

    if (query.unitId) {
      where.unitId = query.unitId;
    }

    if (query.type) {
      where.type = query.type;
    }

    if (query.createdBy) {
      where.createdBy = query.createdBy;
    }

    // Filtro por período
    if (query.startDate || query.endDate) {
      where.eventDate = {};
      if (query.startDate) {
        where.eventDate.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.eventDate.lte = new Date(query.endDate);
      }
    }

    const events = await this.prisma.diaryEvent.findMany({
      where,
      include: {
        child: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        classroom: {
          select: {
            id: true,
            name: true,
          },
        },
        createdByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: {
        eventDate: 'desc',
      },
    });

    return events;
  }

  /**
   * Busca um evento por ID
   */
  async findOne(id: string, user: JwtPayload) {
    const scopedWhere = getScopedWhereForDiaryEvent(user);

    const event = await this.prisma.diaryEvent.findFirst({
      where: {
        id,
        ...scopedWhere,
      },
      include: {
        child: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        classroom: {
          select: {
            id: true,
            name: true,
            unitId: true,
          },
        },
        createdByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        reviewedByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException('Evento não encontrado');
    }

    // Para PROFESSOR, validar se é professor da turma
    if (user.roles.some((role) => role.level === RoleLevel.PROFESSOR)) {
      const isTeacher = await this.prisma.classroomTeacher.findFirst({
        where: {
          classroomId: event.classroomId,
          teacherId: user.sub,
          isActive: true,
        },
      });

      if (!isTeacher) {
        throw new NotFoundException('Evento não encontrado');
      }
    }

    return event;
  }

  /**
   * Atualiza um evento
   */
  async update(id: string, updateDto: UpdateDiaryEventDto, user: JwtPayload) {
    // Buscar evento com escopo
    const event = await this.findOne(id, user);

    // Apenas o criador ou níveis superiores podem editar
    const canEdit =
      event.createdBy === user.sub ||
      user.roles.some(
        (role) =>
          role.level === RoleLevel.DEVELOPER ||
          role.level === RoleLevel.MANTENEDORA ||
          role.level === RoleLevel.UNIDADE,
      );

    if (!canEdit) {
      throw new ForbiddenException(
        'Você não tem permissão para editar este evento',
      );
    }

    const updatedEvent = await this.prisma.diaryEvent.update({
      where: { id },
      data: {
        ...(updateDto.type && { type: updateDto.type }),
        ...(updateDto.title && { title: updateDto.title }),
        ...(updateDto.description && { description: updateDto.description }),
        ...(updateDto.eventDate && { eventDate: new Date(updateDto.eventDate) }),
        ...(updateDto.planningId !== undefined && {
          planningId: updateDto.planningId,
        }),
        ...(updateDto.tags && { tags: updateDto.tags }),
        ...(updateDto.aiContext && { aiContext: updateDto.aiContext }),
        ...(updateDto.mediaUrls && { mediaUrls: updateDto.mediaUrls }),
      },
      include: {
        child: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        classroom: {
          select: {
            id: true,
            name: true,
          },
        },
        createdByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Registrar auditoria
    await this.auditService.logUpdate(
      'DiaryEvent',
      id,
      user.sub,
      event.mantenedoraId,
      event.unitId,
      event,
      updatedEvent,
    );

    return updatedEvent;
  }

  /**
   * Remove um evento (soft delete)
   */
  async remove(id: string, user: JwtPayload) {
    // Buscar evento com escopo
    const event = await this.findOne(id, user);

    // Apenas o criador ou níveis superiores podem deletar
    const canDelete =
      event.createdBy === user.sub ||
      user.roles.some(
        (role) =>
          role.level === RoleLevel.DEVELOPER ||
          role.level === RoleLevel.MANTENEDORA ||
          role.level === RoleLevel.UNIDADE,
      );

    if (!canDelete) {
      throw new ForbiddenException(
        'Você não tem permissão para deletar este evento',
      );
    }

    await this.prisma.diaryEvent.update({
      where: { id },
      data: {
        status: 'ARQUIVADO' as any,
      },
    });

    // Registrar auditoria
    await this.auditService.logDelete(
      'DiaryEvent',
      id,
      user.sub,
      event.mantenedoraId,
      event.unitId,
      event,
    );

    return { message: 'Evento deletado com sucesso' };
  }

  /**
   * Helpers de Segmento/Idade (Sprint 1)
   */
  private diffInMonths(dateOfBirth: Date, eventDate: Date): number {
    const a = new Date(dateOfBirth);
    const b = new Date(eventDate);

    if (b.getTime() < a.getTime()) {
      throw new BadRequestException('eventDate não pode ser anterior à data de nascimento');
    }

    let months = (b.getUTCFullYear() - a.getUTCFullYear()) * 12;
    months += b.getUTCMonth() - a.getUTCMonth();

    // Se o dia do mês ainda não foi alcançado, reduz 1 mês
    if (b.getUTCDate() < a.getUTCDate()) {
      months -= 1;
    }

    return months;
  }

  private inferSegmentFromClassroom(
    ageGroupMin: number,
    ageGroupMax: number,
  ): 'EI01' | 'EI02' | 'EI03' {
    // Regras práticas por faixa etária (meses):
    // EI01: 0–18 | EI02: 19–36 | EI03: 37+
    if (ageGroupMax <= 18) return 'EI01';
    if (ageGroupMax <= 36) return 'EI02';
    return 'EI03';
  }

  /**
   * HARDENING: Validação explícita de acesso por nível hierárquico
   */
  private async validateUserAccess(
    user: JwtPayload,
    classroom: any,
  ): Promise<void> {
    // Developer: bypass total
    if (user.roles.some((role) => role.level === RoleLevel.DEVELOPER)) {
      return;
    }

    // Mantenedora: validar mantenedoraId
    if (user.roles.some((role) => role.level === RoleLevel.MANTENEDORA)) {
      if (classroom.unit.mantenedoraId !== user.mantenedoraId) {
        throw new ForbiddenException(
          'Você não tem permissão para criar eventos nesta turma',
        );
      }
      return;
    }

    // Staff Central: validar se a unidade está no escopo
    if (user.roles.some((role) => role.level === RoleLevel.STAFF_CENTRAL)) {
      const staffRole = user.roles.find(
        (role) => role.level === RoleLevel.STAFF_CENTRAL,
      );
      if (!staffRole?.unitScopes?.includes(classroom.unitId)) {
        throw new ForbiddenException(
          'Você não tem permissão para criar eventos nesta unidade',
        );
      }
      return;
    }

    // Direção/Coordenação: validar unitId
    if (user.roles.some((role) => role.level === RoleLevel.UNIDADE)) {
      if (classroom.unitId !== user.unitId) {
        throw new ForbiddenException(
          'Você não tem permissão para criar eventos nesta unidade',
        );
      }
      return;
    }

    // Professor: validar vínculo em ClassroomTeacher
    if (user.roles.some((role) => role.level === RoleLevel.PROFESSOR)) {
      const isTeacher = await this.prisma.classroomTeacher.findFirst({
        where: {
          classroomId: classroom.id,
          teacherId: user.sub,
          isActive: true,
        },
      });

      if (!isTeacher) {
        throw new ForbiddenException(
          'Você não tem permissão para criar eventos nesta turma',
        );
      }
      return;
    }

    // Se chegou aqui, não tem permissão
    throw new ForbiddenException(
      'Você não tem permissão para criar eventos',
    );
  }

  /**
   * Valida se o usuário tem acesso ao evento
   */
  private async validateAccess(event: any, user: JwtPayload): Promise<void> {
    // Developer tem acesso total
    if (user.roles.some((role) => role.level === RoleLevel.DEVELOPER)) {
      return;
    }

    // Mantenedora: validar mantenedoraId
    if (user.roles.some((role) => role.level === RoleLevel.MANTENEDORA)) {
      if (event.mantenedoraId !== user.mantenedoraId) {
        throw new ForbiddenException('Acesso negado a este evento');
      }
      return;
    }

    // Staff Central: validar se a unidade está no escopo
    if (user.roles.some((role) => role.level === RoleLevel.STAFF_CENTRAL)) {
      const staffRole = user.roles.find(
        (role) => role.level === RoleLevel.STAFF_CENTRAL,
      );
      if (!staffRole?.unitScopes.includes(event.unitId)) {
        throw new ForbiddenException('Acesso negado a este evento');
      }
      return;
    }

    // Unidade: validar unitId
    if (user.roles.some((role) => role.level === RoleLevel.UNIDADE)) {
      if (event.unitId !== user.unitId) {
        throw new ForbiddenException('Acesso negado a este evento');
      }
      return;
    }

    // Professor: validar se é professor da turma
    if (user.roles.some((role) => role.level === RoleLevel.PROFESSOR)) {
      const isTeacher = await this.prisma.classroomTeacher.findFirst({
        where: {
          classroomId: event.classroomId,
          teacherId: user.sub,
          isActive: true,
        },
      });

      if (!isTeacher) {
        throw new ForbiddenException('Acesso negado a este evento');
      }
      return;
    }

    throw new ForbiddenException('Acesso negado a este evento');
  }
}
