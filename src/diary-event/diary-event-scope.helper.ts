import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { RoleLevel } from '@prisma/client';

/**
 * Helper para criar where clause com escopo para DiaryEvent
 * DiaryEvent não tem mantenedoraId/unitId direto, precisa filtrar via classroom
 */
export function getScopedWhereForDiaryEvent(user: JwtPayload) {
  // DEVELOPER tem acesso total
  if (user.roles.some((role) => role.level === RoleLevel.DEVELOPER)) {
    return {};
  }

  // MANTENEDORA: filtrar por mantenedoraId via classroom
  if (user.roles.some((role) => role.level === RoleLevel.MANTENEDORA)) {
    return {
      classroom: {
        mantenedoraId: user.mantenedoraId,
      },
    };
  }

  // STAFF_CENTRAL: filtrar por unitScopes via classroom
  if (user.roles.some((role) => role.level === RoleLevel.STAFF_CENTRAL)) {
    const staffRole = user.roles.find(
      (role) => role.level === RoleLevel.STAFF_CENTRAL,
    );
    return {
      classroom: {
        mantenedoraId: user.mantenedoraId,
        unitId: { in: staffRole?.unitScopes || [] },
      },
    };
  }

  // UNIDADE: filtrar por unitId via classroom
  if (user.roles.some((role) => role.level === RoleLevel.UNIDADE)) {
    return {
      classroom: {
        mantenedoraId: user.mantenedoraId,
        unitId: user.unitId,
      },
    };
  }

  // PROFESSOR: filtrar por classroomTeacher
  // Não podemos fazer isso no where direto, precisa validar depois
  return {
    classroom: {
      mantenedoraId: user.mantenedoraId,
    },
  };
}
