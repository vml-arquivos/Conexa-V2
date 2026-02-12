import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { RoleLevel } from '@prisma/client';

@Injectable()
export class LookupService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retorna unidades acessíveis ao usuário
   * - DEVELOPER/MANTENEDORA: todas as unidades da mantenedora
   * - STAFF_CENTRAL: unidades com escopo (ou todas se não houver escopo)
   * - UNIDADE/PROFESSOR: apenas sua unidade
   */
  async getAccessibleUnits(user: JwtPayload) {
    const mantenedoraId = user.mantenedoraId;

    // DEVELOPER ou MANTENEDORA: todas as unidades
    const hasGlobalAccess = user.roles.some(
      (r) => r.level === RoleLevel.DEVELOPER || r.level === RoleLevel.MANTENEDORA,
    );

    if (hasGlobalAccess) {
      return this.prisma.unit.findMany({
        where: {
          mantenedoraId,
          isActive: true,
        },
        select: {
          id: true,
          code: true,
          name: true,
        },
        orderBy: { name: 'asc' },
      });
    }

    // STAFF_CENTRAL: verificar escopo multi-unidade
    const isStaffCentral = user.roles.some((r) => r.level === RoleLevel.STAFF_CENTRAL);
    if (isStaffCentral) {
      // Buscar escopos de unidades do usuário
      const userRoles = await this.prisma.userRole.findMany({
        where: { userId: user.sub },
        include: {
          role: {
            include: {
              users: {
                where: { userId: user.sub },
                include: {
                  unitScopes: true,
                },
              },
            },
          },
        },
      });

      const unitIds = new Set<string>();
      for (const userRole of userRoles) {
        for (const roleUser of userRole.role.users) {
          for (const scope of roleUser.unitScopes) {
            unitIds.add(scope.unitId);
          }
        }
      }

      if (unitIds.size > 0) {
        return this.prisma.unit.findMany({
          where: {
            id: { in: Array.from(unitIds) },
            isActive: true,
          },
          select: {
            id: true,
            code: true,
            name: true,
          },
          orderBy: { name: 'asc' },
        });
      }

      // Se não houver escopos, retornar todas as unidades
      return this.prisma.unit.findMany({
        where: {
          mantenedoraId,
          isActive: true,
        },
        select: {
          id: true,
          code: true,
          name: true,
        },
        orderBy: { name: 'asc' },
      });
    }

    // UNIDADE ou PROFESSOR: apenas sua unidade
    if (user.unitId) {
      const unit = await this.prisma.unit.findUnique({
        where: { id: user.unitId },
        select: {
          id: true,
          code: true,
          name: true,
        },
      });

      return unit ? [unit] : [];
    }

    return [];
  }

  /**
   * Retorna turmas acessíveis ao usuário em uma unidade específica
   * - DEVELOPER/MANTENEDORA/STAFF_CENTRAL/UNIDADE: todas as turmas da unidade
   * - PROFESSOR: apenas turmas onde é professor
   */
  async getAccessibleClassrooms(user: JwtPayload, unitId?: string) {
    const isProfessor = user.roles.some((r) => r.level === RoleLevel.PROFESSOR);

    // Se for professor, retornar apenas suas turmas
    if (isProfessor) {
      const classroomTeachers = await this.prisma.classroomTeacher.findMany({
        where: {
          teacherId: user.sub,
          isActive: true,
          classroom: {
            isActive: true,
            ...(unitId && { unitId }),
          },
        },
        include: {
          classroom: {
            select: {
              id: true,
              code: true,
              name: true,
              unitId: true,
            },
          },
        },
      });

      return classroomTeachers.map((ct) => ct.classroom);
    }

    // Para outros níveis, retornar todas as turmas da unidade
    const where: any = {
      isActive: true,
    };

    if (unitId) {
      where.unitId = unitId;
    } else if (user.unitId) {
      where.unitId = user.unitId;
    } else {
      // Se não houver unitId, filtrar por mantenedora
      where.unit = {
        mantenedoraId: user.mantenedoraId,
      };
    }

    return this.prisma.classroom.findMany({
      where,
      select: {
        id: true,
        code: true,
        name: true,
        unitId: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Retorna professoras acessíveis em uma unidade (opcional)
   */
  async getAccessibleTeachers(user: JwtPayload, unitId?: string) {
    const where: any = {
      mantenedoraId: user.mantenedoraId,
      status: 'ATIVO',
      roles: {
        some: {
          role: {
            level: RoleLevel.PROFESSOR,
          },
        },
      },
    };

    if (unitId) {
      where.unitId = unitId;
    } else if (user.unitId) {
      where.unitId = user.unitId;
    }

    return this.prisma.user.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    });
  }
}
