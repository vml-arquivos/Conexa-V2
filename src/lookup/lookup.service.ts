import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RoleLevel } from '@prisma/client';

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

@Injectable()
export class LookupService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retorna unidades acessíveis baseado no role do usuário
   * - DEVELOPER/MANTENEDORA: todas as unidades da mantenedora
   * - UNIDADE/PROFESSOR: apenas a unidade do usuário
   */
  async getAccessibleUnits(
    mantenedoraId: string,
    unitId: string | null,
    roleLevel: RoleLevel,
  ): Promise<AccessibleUnit[]> {
    // DEVELOPER/MANTENEDORA: todas as unidades da mantenedora
    if (roleLevel === 'MANTENEDORA' || roleLevel === 'DEVELOPER') {
      const units = await this.prisma.unit.findMany({
        where: { mantenedoraId },
        select: {
          id: true,
          code: true,
          name: true,
        },
        orderBy: { name: 'asc' },
      });
      return units;
    }

    // UNIDADE/PROFESSOR: apenas a própria unidade
    if (!unitId) {
      return [];
    }

    const unit = await this.prisma.unit.findUnique({
      where: { id: unitId },
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
   * - Se PROFESSOR: apenas turmas vinculadas via ClassroomTeacher
   * - Outros: todas as turmas da unidade
   */
  async getAccessibleClassrooms(
    unitId: string | undefined,
    userId: string,
    roleLevel: RoleLevel,
  ): Promise<AccessibleClassroom[]> {
    // PROFESSOR: apenas turmas vinculadas
    if (roleLevel === 'PROFESSOR') {
      const classrooms = await this.prisma.classroom.findMany({
        where: {
          teachers: {
            some: {
              teacherId: userId,
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

    // Outros: todas as turmas da unidade (se unitId fornecido)
    if (!unitId) {
      return [];
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
}
