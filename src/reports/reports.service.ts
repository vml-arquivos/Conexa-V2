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

  /**
   * Dashboard Unificado - Radar de Gestão
   * Sprint 6: Integração segura (read-only, fail-safe)
   */
  async getUnifiedDashboard(user: JwtPayload, unitId?: string) {
    try {
      // Validação de acesso
      const targetUnitId = unitId || user.unitId;
      
      if (!targetUnitId) {
        throw new BadRequestException(
          'unitId é obrigatório (via query ou token)',
        );
      }

      // Verificar se usuário tem acesso à unidade
      if (!user.roles.some((role) => role.level === RoleLevel.DEVELOPER)) {
        const unit = await this.prisma.unit.findUnique({
          where: { id: targetUnitId },
          select: { mantenedoraId: true },
        });

        if (!unit) {
          throw new BadRequestException('Unidade não encontrada');
        }

        // MANTENEDORA: deve ser da mesma mantenedora
        if (user.roles.some((role) => role.level === RoleLevel.MANTENEDORA)) {
          if (unit.mantenedoraId !== user.mantenedoraId) {
            throw new ForbiddenException(
              'Sem acesso à unidade informada',
            );
          }
        }
        // UNIDADE/STAFF_CENTRAL: deve ser a própria unitId
        else if (
          user.roles.some(
            (role) =>
              role.level === RoleLevel.UNIDADE ||
              role.level === RoleLevel.STAFF_CENTRAL,
          )
        ) {
          if (targetUnitId !== user.unitId) {
            throw new ForbiddenException(
              'Sem acesso à unidade informada',
            );
          }
        }
      }

      // === LÓGICA PEDAGÓGICA: Aderência à Matriz Curricular ===
      const totalEvents = await this.prisma.diaryEvent.count({
        where: { unitId: targetUnitId },
      });

      const eventsWithoutMatrix = await this.prisma.diaryEvent.count({
        where: {
          unitId: targetUnitId,
          curriculumEntryId: null as any,
        },
      });

      const adherenceRate =
        totalEvents > 0
          ? ((totalEvents - eventsWithoutMatrix) / totalEvents) * 100
          : 0;

      const pedagogicalStatus =
        adherenceRate >= 80 ? 'OK' : adherenceRate >= 60 ? 'WARNING' : 'CRITICAL';

      // === LÓGICA OPERACIONAL: Gargalos Críticos ===
      const twoDaysAgo = new Date();
      twoDaysAgo.setHours(twoDaysAgo.getHours() - 48);

      const criticalBottlenecks = await this.prisma.materialRequest.count({
        where: {
          unitId: targetUnitId,
          status: 'SOLICITADO',
          requestedDate: {
            lt: twoDaysAgo,
          },
        },
      });

      return {
        pedagogical: {
          adherenceRate: Math.round(adherenceRate * 100) / 100,
          status: pedagogicalStatus,
          totalEvents,
          eventsWithoutMatrix,
        },
        operational: {
          criticalBottlenecks,
        },
      };
    } catch (error) {
      // Fail-safe: retornar valores zerados em caso de erro
      if (
        error instanceof BadRequestException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      console.error('Erro ao calcular dashboard unificado:', error);
      
      return {
        pedagogical: {
          adherenceRate: 0,
          status: 'CRITICAL' as const,
          totalEvents: 0,
          eventsWithoutMatrix: 0,
        },
        operational: {
          criticalBottlenecks: 0,
        },
      };
    }
  }
}
