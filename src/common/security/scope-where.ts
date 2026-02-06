import { NotFoundException, ForbiddenException } from '@nestjs/common';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { RoleLevel } from '@prisma/client';

/**
 * Helper para criar where clause com escopo de mantenedora
 */
export function scopedWhereForMantenedora(user: JwtPayload) {
  // DEVELOPER tem acesso total
  if (user.roles.some((role) => role.level === RoleLevel.DEVELOPER)) {
    return {};
  }

  // Todos os outros filtram por mantenedoraId
  return {
    mantenedoraId: user.mantenedoraId,
  };
}

/**
 * Helper para criar where clause com escopo de unidade
 * Usado para models que têm unitId (Planning, DiaryEvent via classroom)
 */
export function scopedWhereForUnit(user: JwtPayload) {
  // DEVELOPER tem acesso total
  if (user.roles.some((role) => role.level === RoleLevel.DEVELOPER)) {
    return {};
  }

  // MANTENEDORA acessa tudo da mantenedora
  if (user.roles.some((role) => role.level === RoleLevel.MANTENEDORA)) {
    return {
      mantenedoraId: user.mantenedoraId,
    };
  }

  // STAFF_CENTRAL acessa unidades vinculadas
  if (user.roles.some((role) => role.level === RoleLevel.STAFF_CENTRAL)) {
    const staffRole = user.roles.find(
      (role) => role.level === RoleLevel.STAFF_CENTRAL,
    );
    return {
      mantenedoraId: user.mantenedoraId,
      unitId: { in: staffRole?.unitScopes || [] },
    };
  }

  // UNIDADE acessa apenas sua unidade
  if (user.roles.some((role) => role.level === RoleLevel.UNIDADE)) {
    return {
      mantenedoraId: user.mantenedoraId,
      unitId: user.unitId,
    };
  }

  // PROFESSOR não deveria acessar por unitId diretamente
  // (usa classroomId via ClassroomTeacher)
  return {
    mantenedoraId: user.mantenedoraId,
  };
}

/**
 * Helper para lançar NotFoundException padrão
 */
export function notFound(resource: string): never {
  throw new NotFoundException(`${resource} não encontrado(a)`);
}

/**
 * Helper para lançar ForbiddenException padrão
 */
export function forbidden(message = 'Acesso negado'): never {
  throw new ForbiddenException(message);
}

/**
 * Helper para validar se registro pertence ao escopo do usuário
 * Lança NotFoundException se não encontrar (não 403, para não vazar existência)
 */
export function validateScope<T extends { mantenedoraId: string }>(
  record: T | null,
  user: JwtPayload,
  resourceName: string,
): T {
  if (!record) {
    notFound(resourceName);
  }

  // DEVELOPER tem acesso total
  if (user.roles.some((role) => role.level === RoleLevel.DEVELOPER)) {
    return record;
  }

  // Validar mantenedoraId
  if (record.mantenedoraId !== user.mantenedoraId) {
    // Não vazar existência do registro
    notFound(resourceName);
  }

  return record;
}

/**
 * Helper para validar se registro com unitId pertence ao escopo do usuário
 */
export function validateScopeWithUnit<
  T extends { mantenedoraId: string; unitId: string },
>(record: T | null, user: JwtPayload, resourceName: string): T {
  if (!record) {
    notFound(resourceName);
  }

  // DEVELOPER tem acesso total
  if (user.roles.some((role) => role.level === RoleLevel.DEVELOPER)) {
    return record;
  }

  // Validar mantenedoraId
  if (record.mantenedoraId !== user.mantenedoraId) {
    notFound(resourceName);
  }

  // MANTENEDORA tem acesso a todas as unidades
  if (user.roles.some((role) => role.level === RoleLevel.MANTENEDORA)) {
    return record;
  }

  // STAFF_CENTRAL valida unitScopes
  if (user.roles.some((role) => role.level === RoleLevel.STAFF_CENTRAL)) {
    const staffRole = user.roles.find(
      (role) => role.level === RoleLevel.STAFF_CENTRAL,
    );
    if (!staffRole?.unitScopes?.includes(record.unitId)) {
      notFound(resourceName);
    }
    return record;
  }

  // UNIDADE valida unitId
  if (user.roles.some((role) => role.level === RoleLevel.UNIDADE)) {
    if (record.unitId !== user.unitId) {
      notFound(resourceName);
    }
    return record;
  }

  // PROFESSOR não deveria acessar por unitId diretamente
  notFound(resourceName);
}
