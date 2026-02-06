import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { RoleLevel } from '@prisma/client';

/**
 * Helper para criar where clause com escopo para Planning
 */
export function getScopedWhereForPlanning(user: JwtPayload) {
  // DEVELOPER tem acesso total
  if (user.roles.some((role) => role.level === RoleLevel.DEVELOPER)) {
    return {};
  }

  // MANTENEDORA: filtrar por mantenedoraId
  if (user.roles.some((role) => role.level === RoleLevel.MANTENEDORA)) {
    return {
      mantenedoraId: user.mantenedoraId,
    };
  }

  // STAFF_CENTRAL: filtrar por unitScopes
  if (user.roles.some((role) => role.level === RoleLevel.STAFF_CENTRAL)) {
    const staffRole = user.roles.find(
      (role) => role.level === RoleLevel.STAFF_CENTRAL,
    );
    return {
      mantenedoraId: user.mantenedoraId,
      unitId: { in: staffRole?.unitScopes || [] },
    };
  }

  // UNIDADE: filtrar por unitId
  if (user.roles.some((role) => role.level === RoleLevel.UNIDADE)) {
    return {
      mantenedoraId: user.mantenedoraId,
      unitId: user.unitId,
    };
  }

  // PROFESSOR: filtrar por classroomTeacher
  // Não podemos fazer isso no where direto, precisa validar depois
  return {
    mantenedoraId: user.mantenedoraId,
  };
}
