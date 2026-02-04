import { SetMetadata } from '@nestjs/common';
import { RoleLevel } from '@prisma/client';

export const ROLES_KEY = 'roles';

/**
 * Decorator para definir os níveis de acesso (RoleLevel) necessários para acessar uma rota
 * @param roles - Array de RoleLevel (ex: RoleLevel.DEVELOPER, RoleLevel.MANTENEDORA)
 */
export const RequireRoles = (...roles: RoleLevel[]) =>
  SetMetadata(ROLES_KEY, roles);
