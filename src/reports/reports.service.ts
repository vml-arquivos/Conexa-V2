import {
  Injectable,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { RoleLevel } from '@prisma/client';
import { canAccessUnit } from '../common/utils/can-access-unit';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  private async getStaffCentralUnitScopes(userId: string): Promise<string[]> {
    const scopes = await this.prisma.userRoleUnitScope.findMany({
      where: {
        userRole: {
          userId,
          isActive: true,
          role: {
            level: RoleLevel.STAFF_CENTRAL,
          },
        },
      },
      select: { unitId: true },
    });

    return scopes.map((scope) => scope.unitId);
  }

  private getFullName(person?: {
    firstName?: string | null;
    lastName?: string | null;
    name?: string | null;
  } | null): string {
    if (!person) return '—';

    if (person.name?.trim()) return person.name.trim();

    return `${person.firstName || ''} ${person.lastName || ''}`.trim() || '—';
  }

  /**
   * Relatório de diário por turma
   */
  async getDiaryByClassroom(
    classroomId: string,
    startDate: string,
    endDate: string,
    user: JwtPayload,
  ) {
    if (!classroomId || !startDate || !endDate) {
      throw new BadRequestException(
        'classroomId, startDate e endDate são obrigatórios',
      );
    }

    // Validar acesso à turma
    const classroom = await this.prisma.classroom.findUnique({
      where: { id: classroomId },
      include: {
        unit: {
          select: {
            id: true,
            mantenedoraId: true,
            name: true,
          },
        },
      },
    });

    if (!classroom) {
      throw new BadRequestException('Turma não encontrada');
    }

    // RBAC: Professor só pode ver da própria turma
    if (user.roles.some((role) => role.level === RoleLevel.PROFESSOR)) {
      const isTeacher = await this.prisma.classroomTeacher.findFirst({
        where: {
          classroomId,
          teacherId: user.sub,
          isActive: true,
        },
      });

      if (!isTeacher) {
        throw new ForbiddenException(
          'Você não tem permissão para acessar esta turma',
        );
      }
    }

    const hasAccessToUnit = await canAccessUnit(
      user,
      classroom.unit.id,
      async ({ userId }) => this.getStaffCentralUnitScopes(userId),
    );

    if (!hasAccessToUnit) {
      throw new ForbiddenException('Sem acesso à unidade informada');
    }

    // Buscar eventos
    const events = await this.prisma.diaryEvent.findMany({
      where: {
        classroomId,
        eventDate: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      include: {
        child: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        unit: {
          select: {
            id: true,
            name: true,
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
          },
        },
        planning: {
          select: {
            id: true,
            startDate: true,
            endDate: true,
            status: true,
          },
        },
        curriculumEntry: {
          select: {
            id: true,
            date: true,
            campoDeExperiencia: true,
            objetivoBNCC: true,
          },
        },
      },
      orderBy: {
        eventDate: 'asc',
      },
    });

    const enrichedEvents = events.map((event) => ({
      ...event,
      unitName: event.unit.name,
      classroomName: event.classroom.name,
      childName: this.getFullName(event.child),
      teacherName: this.getFullName(event.createdByUser),
    }));

    return {
      classroomId,
      classroomName: classroom.name,
      unitId: classroom.unit.id,
      unitName: classroom.unit.name,
      startDate,
      endDate,
      totalEvents: enrichedEvents.length,
      events: enrichedEvents,
    };
  }

  /**
   * Relatório de diário por período
   */
  async getDiaryByPeriod(
    startDate: string,
    endDate: string,
    user: JwtPayload,
  ) {
    if (!startDate || !endDate) {
      throw new BadRequestException('startDate e endDate são obrigatórios');
    }

    // Filtrar por escopo do usuário
    const where: any = {
      eventDate: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
    };

    // Developer: sem filtro adicional
    if (!user.roles.some((role) => role.level === RoleLevel.DEVELOPER)) {
      // Mantenedora: filtrar por mantenedoraId
      if (user.roles.some((role) => role.level === RoleLevel.MANTENEDORA)) {
        where.mantenedoraId = user.mantenedoraId;
      }
      // Staff Central: filtrar por unitScopes
      else if (
        user.roles.some((role) => role.level === RoleLevel.STAFF_CENTRAL)
      ) {
        const unitScopes = await this.getStaffCentralUnitScopes(user.sub);
        where.unitId = {
          in: unitScopes.length > 0 ? unitScopes : ['__sem_escopo__'],
        };
      }
      // Unidade: filtrar por unitId
      else if (user.roles.some((role) => role.level === RoleLevel.UNIDADE)) {
        where.unitId = user.unitId;
      }
    }

    const events = await this.prisma.diaryEvent.findMany({
      where,
      include: {
        classroom: {
          select: {
            id: true,
            name: true,
          },
        },
        unit: {
          select: {
            id: true,
            name: true,
          },
        },
        child: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        createdByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        planning: {
          select: {
            id: true,
            status: true,
          },
        },
      },
      orderBy: {
        eventDate: 'asc',
      },
    });

    const enrichedEvents = events.map((event) => ({
      ...event,
      unitName: event.unit.name,
      classroomName: event.classroom.name,
      childName: this.getFullName(event.child),
      teacherName: this.getFullName(event.createdByUser),
    }));

    return {
      startDate,
      endDate,
      totalEvents: enrichedEvents.length,
      events: enrichedEvents,
    };
  }

  /**
   * Relatório de eventos sem planning
   */
  async getUnplannedDiaryEvents(user: JwtPayload) {
    // Filtrar por escopo do usuário
    const where: any = {
      OR: [
        { planningId: null },
        {
          planning: {
            is: null,
          },
        },
      ],
    };

    // Developer: sem filtro adicional
    if (!user.roles.some((role) => role.level === RoleLevel.DEVELOPER)) {
      // Mantenedora: filtrar por mantenedoraId
      if (user.roles.some((role) => role.level === RoleLevel.MANTENEDORA)) {
        where.mantenedoraId = user.mantenedoraId;
      }
      // Staff Central: filtrar por unitScopes
      else if (
        user.roles.some((role) => role.level === RoleLevel.STAFF_CENTRAL)
      ) {
        const unitScopes = await this.getStaffCentralUnitScopes(user.sub);
        where.unitId = {
          in: unitScopes.length > 0 ? unitScopes : ['__sem_escopo__'],
        };
      }
      // Unidade: filtrar por unitId
      else if (user.roles.some((role) => role.level === RoleLevel.UNIDADE)) {
        where.unitId = user.unitId;
      }
    }

    const events = await this.prisma.diaryEvent.findMany({
      where,
      include: {
        classroom: {
          select: {
            id: true,
            name: true,
          },
        },
        unit: {
          select: {
            id: true,
            name: true,
          },
        },
        child: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        createdByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        eventDate: 'desc',
      },
    });

    const enrichedEvents = events.map((event) => ({
      ...event,
      unitName: event.unit.name,
      classroomName: event.classroom.name,
      childName: this.getFullName(event.child),
      teacherName: this.getFullName(event.createdByUser),
    }));

    return {
      totalUnplanned: enrichedEvents.length,
      events: enrichedEvents,
    };
  }


}
