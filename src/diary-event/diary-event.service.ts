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
import { RoleLevel, PlanningStatus } from '@prisma/client';
import {
  getPedagogicalDay,
  isSamePedagogicalDay,
  formatPedagogicalDate,
} from '../common/utils/date.utils';

@Injectable()
export class DiaryEventService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Cria um novo evento no diário de bordo
   */
  async create(createDto: CreateDiaryEventDto, user: JwtPayload) {
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
      throw new BadRequestException(
        'Criança não está matriculada nesta turma',
      );
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

    // VALIDAÇÃO CRÍTICA 1: Validar Planning obrigatório
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

    // VALIDAÇÃO CRÍTICA 2: Planning deve estar EM_EXECUCAO
    if (planning.status !== PlanningStatus.EM_EXECUCAO) {
      throw new BadRequestException(
        `Apenas planejamentos ativos podem receber eventos. Status atual: ${planning.status}`,
      );
    }

    // Planning type não existe mais no schema

    // VALIDAÇÃO CRÍTICA 4: Data do evento deve estar dentro do período do Planning
    const eventDate = new Date(createDto.eventDate);
    const planningStart = new Date(planning.startDate);
    const planningEnd = new Date(planning.endDate);

    if (eventDate < planningStart || eventDate > planningEnd) {
      throw new BadRequestException(
        `A data do evento (${eventDate.toLocaleDateString()}) deve estar dentro do período do planejamento (${planningStart.toLocaleDateString()} - ${planningEnd.toLocaleDateString()})`,
      );
    }

    // VALIDAÇÃO CRÍTICA 5: Planning deve pertencer à mesma turma
    if (planning.classroomId !== createDto.classroomId) {
      throw new BadRequestException(
        'O planejamento não pertence à turma informada',
      );
    }

    // VALIDAÇÃO CRÍTICA 6: Validar CurriculumEntry obrigatório
    const entry = await this.prisma.curriculumMatrixEntry.findUnique({
      where: { id: createDto.curriculumEntryId },
      include: { matrix: true },
    });

    if (!entry) {
      throw new NotFoundException('Entrada da matriz curricular não encontrada');
    }

    // VALIDAÇÃO CRÍTICA 7: Data do evento deve corresponder à data da entrada
    // PADRONIZAÇÃO DE TIMEZONE: Comparar "dia pedagógico" no fuso America/Sao_Paulo
    const entryDate = new Date(entry.date);
    
    if (!isSamePedagogicalDay(eventDate, entryDate)) {
      throw new BadRequestException(
        `A data do evento (${formatPedagogicalDate(eventDate)}) não corresponde à data da entrada da matriz (${formatPedagogicalDate(entryDate)})`,
      );
    }

    // VALIDAÇÃO CRÍTICA 8: CurriculumEntry deve pertencer à matriz do Planning
    if (planning.curriculumMatrixId && entry.matrixId !== planning.curriculumMatrixId) {
      throw new BadRequestException(
        'A entrada da matriz não pertence à matriz curricular do planejamento',
      );
    }

    // Criar o evento
    const diaryEvent = await this.prisma.diaryEvent.create({
      data: {
        type: createDto.type,
        title: createDto.title,
        description: createDto.description,
        eventDate: new Date(createDto.eventDate),
        childId: createDto.childId,
        classroomId: createDto.classroomId,
        planningId: createDto.planningId,
        curriculumEntryId: createDto.curriculumEntryId, // NOVO
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

    // Registrar auditoria
    await this.auditService.logCreate(
      'DiaryEvent',
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
    const event = await this.prisma.diaryEvent.findUnique({
      where: { id },
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

    // Validar acesso
    await this.validateAccess(event, user);

    return event;
  }

  /**
   * Atualiza um evento
   */
  async update(id: string, updateDto: UpdateDiaryEventDto, user: JwtPayload) {
    const event = await this.prisma.diaryEvent.findUnique({
      where: { id },
      include: {
        classroom: true,
      },
    });

    if (!event) {
      throw new NotFoundException('Evento não encontrado');
    }

    // Validar acesso
    await this.validateAccess(event, user);

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
    const event = await this.prisma.diaryEvent.findUnique({
      where: { id },
      include: {
        classroom: true,
      },
    });

    if (!event) {
      throw new NotFoundException('Evento não encontrado');
    }

    // Validar acesso
    await this.validateAccess(event, user);

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
