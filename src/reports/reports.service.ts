import {
  Injectable,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { RoleLevel } from '@prisma/client';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

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

    return {
      classroomId,
      startDate,
      endDate,
      totalEvents: events.length,
      events,
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
      // Staff Central: filtrar por unitId
      else if (
        user.roles.some((role) => role.level === RoleLevel.STAFF_CENTRAL)
      ) {
        where.unitId = user.unitId;
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
        child: {
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

    return {
      startDate,
      endDate,
      totalEvents: events.length,
      events,
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
      // Staff Central: filtrar por unitId
      else if (
        user.roles.some((role) => role.level === RoleLevel.STAFF_CENTRAL)
      ) {
        where.unitId = user.unitId;
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
        child: {
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

    return {
      totalUnplanned: events.length,
      events,
    };
  }


}
