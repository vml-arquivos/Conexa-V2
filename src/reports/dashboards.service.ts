import {
  Injectable,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { RoleLevel } from '@prisma/client';

@Injectable()
export class DashboardsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Dashboard da Unidade - KPIs operacionais e pedagógicos
   * GET /reports/dashboard/unit
   */
  async getUnitDashboard(
    user: JwtPayload,
    unitId?: string,
    from?: string,
    to?: string,
  ) {
    try {
      // Determinar unitId alvo
      const targetUnitId = unitId || user.unitId;

      if (!targetUnitId) {
        throw new BadRequestException(
          'unitId é obrigatório (via query ou token)',
        );
      }

      // Validação de acesso multi-tenant
      if (!user.roles.some((role) => role.level === RoleLevel.DEVELOPER)) {
        const unit = await this.prisma.unit.findUnique({
          where: { id: targetUnitId },
          select: { mantenedoraId: true },
        });

        if (!unit) {
          throw new BadRequestException('Unidade não encontrada');
        }

        // MANTENEDORA: verificar mesma mantenedora
        if (user.roles.some((role) => role.level === RoleLevel.MANTENEDORA)) {
          if (unit.mantenedoraId !== user.mantenedoraId) {
            throw new ForbiddenException('Sem acesso à unidade informada');
          }
        }
        // UNIDADE/STAFF_CENTRAL: verificar própria unitId
        else if (
          user.roles.some(
            (role) =>
              role.level === RoleLevel.UNIDADE ||
              role.level === RoleLevel.STAFF_CENTRAL,
          )
        ) {
          if (targetUnitId !== user.unitId) {
            throw new ForbiddenException('Sem acesso à unidade informada');
          }
        }
      }

      // Definir período (padrão: últimos 7 dias)
      const endDate = to ? new Date(to) : new Date();
      const startDate = from
        ? new Date(from)
        : new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

      // KPI 1: Total de eventos de diário criados
      const diaryCreatedTotal = await this.prisma.diaryEvent.count({
        where: {
          unitId: targetUnitId,
          eventDate: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      // KPI 2: Eventos não planejados (sem planningId)
      const unplannedCount = await this.prisma.diaryEvent.count({
        where: {
          unitId: targetUnitId,
          eventDate: {
            gte: startDate,
            lte: endDate,
          },
          planningId: null as any,
        },
      });

      // KPI 3: Planejamentos em rascunho ou pendentes
      const planningsDraftOrPending = await this.prisma.planning.count({
        where: {
          unitId: targetUnitId,
          status: {
            in: ['RASCUNHO', 'PUBLICADO'],
          },
        },
      });

      // KPI 4: Total de turmas
      const classroomsCount = await this.prisma.classroom.count({
        where: {
          unitId: targetUnitId,
          isActive: true,
        },
      });

      // KPI 5: Total de crianças ativas
      const activeChildrenCount = await this.prisma.child.count({
        where: {
          unitId: targetUnitId,
          isActive: true,
        },
      });

      return {
        unitId: targetUnitId,
        period: {
          from: startDate.toISOString().split('T')[0],
          to: endDate.toISOString().split('T')[0],
        },
        kpis: {
          diaryCreatedTotal,
          unplannedCount,
          planningsDraftOrPending,
          classroomsCount,
          activeChildrenCount,
        },
      };
    } catch (error) {
      // Fail-safe: propagar erros de validação, retornar zerados para outros
      if (
        error instanceof BadRequestException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      console.error('Erro ao calcular dashboard da unidade:', error);

      return {
        unitId: unitId || user.unitId || 'unknown',
        period: {
          from: from || new Date().toISOString().split('T')[0],
          to: to || new Date().toISOString().split('T')[0],
        },
        kpis: {
          diaryCreatedTotal: 0,
          unplannedCount: 0,
          planningsDraftOrPending: 0,
          classroomsCount: 0,
          activeChildrenCount: 0,
        },
      };
    }
  }

  /**
   * Dashboard do Professor - KPIs por turma no dia
   * GET /reports/dashboard/teacher
   */
  async getTeacherDashboard(
    user: JwtPayload,
    date?: string,
    classroomId?: string,
  ) {
    try {
      // Data padrão: hoje
      const targetDate = date ? new Date(date) : new Date();
      targetDate.setHours(0, 0, 0, 0);

      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      // Se classroomId fornecido, validar acesso
      if (classroomId) {
        // Verificar se professor tem acesso à turma
        if (user.roles.some((role) => role.level === RoleLevel.PROFESSOR)) {
          const teacherAccess = await this.prisma.classroomTeacher.findFirst({
            where: {
              classroomId,
              teacherId: user.sub,
              isActive: true,
            },
          });

          if (!teacherAccess) {
            throw new ForbiddenException(
              'Você não tem acesso a esta turma',
            );
          }
        }

        // Buscar KPIs da turma específica
        const classroom = await this.prisma.classroom.findUnique({
          where: { id: classroomId },
          select: { id: true, name: true, unitId: true },
        });

        if (!classroom) {
          throw new BadRequestException('Turma não encontrada');
        }

        const kpis = await this.getClassroomKPIs(
          classroomId,
          targetDate,
          endOfDay,
        );

        return {
          date: targetDate.toISOString().split('T')[0],
          classrooms: [
            {
              classroomId: classroom.id,
              classroomName: classroom.name,
              ...kpis,
            },
          ],
        };
      }

      // Sem classroomId: buscar todas as turmas do professor
      if (user.roles.some((role) => role.level === RoleLevel.PROFESSOR)) {
        const teacherClassrooms = await this.prisma.classroomTeacher.findMany({
          where: {
            teacherId: user.sub,
            isActive: true,
          },
          include: {
            classroom: {
              select: {
                id: true,
                name: true,
                unitId: true,
              },
            },
          },
        });

        const classroomsData = await Promise.all(
          teacherClassrooms.map(async (tc) => {
            const kpis = await this.getClassroomKPIs(
              tc.classroom.id,
              targetDate,
              endOfDay,
            );

            return {
              classroomId: tc.classroom.id,
              classroomName: tc.classroom.name,
              ...kpis,
            };
          }),
        );

        return {
          date: targetDate.toISOString().split('T')[0],
          classrooms: classroomsData,
        };
      }

      // Roles globais sem classroomId: erro
      throw new BadRequestException(
        'classroomId é obrigatório para roles não-professor',
      );
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      console.error('Erro ao calcular dashboard do professor:', error);

      return {
        date: date || new Date().toISOString().split('T')[0],
        classrooms: [],
      };
    }
  }

  /**
   * Helper: Calcular KPIs de uma turma no dia
   */
  private async getClassroomKPIs(
    classroomId: string,
    startDate: Date,
    endDate: Date,
  ) {
    // Total de eventos do diário
    const totalDiaryEvents = await this.prisma.diaryEvent.count({
      where: {
        classroomId,
        eventDate: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // Eventos não planejados
    const unplannedEvents = await this.prisma.diaryEvent.count({
      where: {
        classroomId,
        eventDate: {
          gte: startDate,
          lte: endDate,
        },
        planningId: null as any,
      },
    });

    // Microgestos preenchidos (assumindo campo microGestures no DiaryEvent)
    // Se não existir, retornar 0
    const microGesturesFilled = 0; // TODO: implementar quando campo existir

    // Status do planejamento ativo
    const activePlanning = await this.prisma.planning.findFirst({
      where: {
        classroomId,
        startDate: {
          lte: endDate,
        },
        endDate: {
          gte: startDate,
        },
      },
      select: {
        id: true,
        status: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      totalDiaryEvents,
      unplannedEvents,
      microGesturesFilled,
      activePlanningStatus: activePlanning?.status || null,
    };
  }
}
