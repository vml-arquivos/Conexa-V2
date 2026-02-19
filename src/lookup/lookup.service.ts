import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RoleLevel } from '@prisma/client';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

export interface AccessibleUnit {
  id: string;
  code: string;
  name: string;
}

export interface AccessibleClassroom {
  id: string;
  code: string;
  name: string;
  unitId: string;
}

export interface AccessibleTeacher {
  id: string;
  name: string;
  email: string;
  unitId: string;
}

export interface AccessibleChild {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  classroomId?: string;
}

@Injectable()
export class LookupService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retorna unidades acessíveis baseado no role do usuário
   * 
   * Lógica de acesso:
   * 1. Se usuário tem unitScopes (STAFF_CENTRAL, etc): retorna units desses scopes
   * 2. Se usuário tem role global (DEVELOPER, MANTENEDORA_*): retorna todas units da mantenedora
   * 3. Se usuário tem unitId (UNIDADE_*, PROFESSOR): retorna apenas sua unit
   */
  async getAccessibleUnits(user: JwtPayload): Promise<AccessibleUnit[]> {
    // 1. Coletar todos os unitScopes de todas as roles
    const allUnitScopes: string[] = [];
    for (const role of user.roles) {
      if (role.unitScopes && role.unitScopes.length > 0) {
        allUnitScopes.push(...role.unitScopes);
      }
    }

    // Se tem unitScopes, retornar units desses scopes
    if (allUnitScopes.length > 0) {
      const uniqueUnitIds = Array.from(new Set(allUnitScopes));
      const units = await this.prisma.unit.findMany({
        where: {
          id: { in: uniqueUnitIds },
          mantenedoraId: user.mantenedoraId, // Garantir que pertence à mesma mantenedora
        },
        select: {
          id: true,
          code: true,
          name: true,
        },
        orderBy: { name: 'asc' },
      });
      return units;
    }

    // 2. Verificar se tem role global (DEVELOPER, MANTENEDORA_*, STAFF_CENTRAL_*)
    const hasGlobalRole = user.roles.some((role) =>
      ['DEVELOPER', 'MANTENEDORA', 'STAFF_CENTRAL'].includes(role.level),
    );

    if (hasGlobalRole) {
      const units = await this.prisma.unit.findMany({
        where: { mantenedoraId: user.mantenedoraId },
        select: {
          id: true,
          code: true,
          name: true,
        },
        orderBy: { name: 'asc' },
      });
      return units;
    }

    // 3. UNIDADE/PROFESSOR: apenas a própria unidade
    if (!user.unitId) {
      return [];
    }

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

  /**
   * Retorna turmas acessíveis por unitId
   * 
   * Lógica de acesso:
   * 1. PROFESSOR: apenas turmas vinculadas via ClassroomTeacher
   * 2. STAFF_CENTRAL com unitScopes: permitir apenas units dos scopes
   * 3. UNIDADE_*: permitir apenas da unitId do usuário
   * 4. Roles globais: permitir qualquer unit da mantenedora
   */
  async getAccessibleClassrooms(
    user: JwtPayload,
    unitId?: string,
  ): Promise<AccessibleClassroom[]> {
    // 1. PROFESSOR: apenas turmas vinculadas
    const isProfessor = user.roles.some((role) => role.level === 'PROFESSOR');
    if (isProfessor) {
      const classrooms = await this.prisma.classroom.findMany({
        where: {
          teachers: {
            some: {
              teacherId: user.sub, // user.sub é o userId
            },
          },
          ...(unitId && { unitId }),
        },
        select: {
          id: true,
          code: true,
          name: true,
          unitId: true,
        },
        orderBy: { name: 'asc' },
      });
      return classrooms;
    }

    // 2. Coletar unitScopes
    const allUnitScopes: string[] = [];
    for (const role of user.roles) {
      if (role.unitScopes && role.unitScopes.length > 0) {
        allUnitScopes.push(...role.unitScopes);
      }
    }

    // Se tem unitScopes e unitId foi fornecido, validar acesso
    if (allUnitScopes.length > 0) {
      if (unitId) {
        // Verificar se unitId está nos scopes
        if (!allUnitScopes.includes(unitId)) {
          throw new ForbiddenException(
            'Você não tem acesso a turmas desta unidade',
          );
        }

        // Retornar turmas da unit solicitada
        const classrooms = await this.prisma.classroom.findMany({
          where: { unitId },
          select: {
            id: true,
            code: true,
            name: true,
            unitId: true,
          },
          orderBy: { name: 'asc' },
        });
        return classrooms;
      }

      // Se unitId não foi fornecido, retornar turmas de todas as units dos scopes (com limite)
      const uniqueUnitIds = Array.from(new Set(allUnitScopes));
      const classrooms = await this.prisma.classroom.findMany({
        where: {
          unitId: { in: uniqueUnitIds },
        },
        select: {
          id: true,
          code: true,
          name: true,
          unitId: true,
        },
        orderBy: { name: 'asc' },
        take: 100, // Limite de segurança
      });
      return classrooms;
    }

    // 3. UNIDADE_*: apenas da unitId do usuário
    const isUnidadeRole = user.roles.some((role) => role.level === 'UNIDADE');
    if (isUnidadeRole && user.unitId) {
      if (unitId && unitId !== user.unitId) {
        throw new ForbiddenException(
          'Você não tem acesso a turmas desta unidade',
        );
      }

      const classrooms = await this.prisma.classroom.findMany({
        where: { unitId: user.unitId },
        select: {
          id: true,
          code: true,
          name: true,
          unitId: true,
        },
        orderBy: { name: 'asc' },
      });
      return classrooms;
    }

    // 4. Roles globais (DEVELOPER, MANTENEDORA): qualquer unit
    const hasGlobalRole = user.roles.some((role) =>
      ['DEVELOPER', 'MANTENEDORA'].includes(role.level),
    );

    if (hasGlobalRole) {
      if (!unitId) {
        return []; // Requer unitId para evitar retornar todas as turmas
      }

      const classrooms = await this.prisma.classroom.findMany({
        where: { unitId },
        select: {
          id: true,
          code: true,
          name: true,
          unitId: true,
        },
        orderBy: { name: 'asc' },
      });
      return classrooms;
    }

    // Nenhuma regra aplicada
    return [];
  }

  /**
   * Retorna professores acessíveis por unitId
   * - Filtra por role PROFESSOR
   */
  async getAccessibleTeachers(
    unitId: string | undefined,
  ): Promise<AccessibleTeacher[]> {
    if (!unitId) {
      return [];
    }

    const users = await this.prisma.user.findMany({
      where: {
        unitId,
        roles: {
          some: {
            scopeLevel: 'PROFESSOR',
          },
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        unitId: true,
      },
      orderBy: { firstName: 'asc' },
    });

    return users.map((u) => ({
      id: u.id,
      name: `${u.firstName} ${u.lastName}`.trim() || u.email,
      email: u.email,
      unitId: u.unitId || '',
    }));
  }

  /**
   * Retorna crianças acessíveis por turma (classroomId)
   * - PROFESSOR: apenas crianças das suas turmas
   * - UNIDADE/STAFF_CENTRAL/MANTENEDORA/DEVELOPER: crianças da turma solicitada
   */
  async getAccessibleChildren(
    user: JwtPayload,
    classroomId?: string,
  ): Promise<AccessibleChild[]> {
    if (!classroomId) {
      return [];
    }

    // Verificar se a turma existe e pertence à mantenedora do usuário
    const classroom = await this.prisma.classroom.findFirst({
      where: {
        id: classroomId,
        unit: {
          mantenedoraId: user.mantenedoraId,
        },
      },
    });

    if (!classroom) {
      throw new ForbiddenException('Turma não encontrada ou sem acesso');
    }

    // PROFESSOR: verificar se tem acesso à turma
    const isProfessor = user.roles.some((role) => role.level === 'PROFESSOR');
    if (isProfessor) {
      const hasAccess = await this.prisma.classroomTeacher.findFirst({
        where: {
          classroomId,
          teacherId: user.sub,
          isActive: true,
        },
      });
      if (!hasAccess) {
        throw new ForbiddenException('Você não tem acesso a esta turma');
      }
    }

    // Buscar crianças matriculadas na turma (via Enrollment)
    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        classroomId,
        status: 'ATIVA',
      },
      include: {
        child: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        child: {
          firstName: 'asc',
        },
      },
    });

    return enrollments.map((e) => ({
      id: e.child.id,
      firstName: e.child.firstName,
      lastName: e.child.lastName,
      name: `${e.child.firstName} ${e.child.lastName}`.trim(),
      classroomId,
    }));
  }

  /**
   * Retorna crianças de uma turma específica (endpoint alternativo)
   */
  async getChildrenByClassroom(
    classroomId: string,
    user: JwtPayload,
  ): Promise<AccessibleChild[]> {
    return this.getAccessibleChildren(user, classroomId);
  }
}
