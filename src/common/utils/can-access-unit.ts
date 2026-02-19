import { RoleLevel } from '@prisma/client';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';

type LoadUnitScopesFn = (params: { userId: string }) => Promise<string[]>;

/**
 * Verifica se o usuário tem acesso a uma unidade específica
 * 
 * Regras de autorização:
 * - DEVELOPER: acesso total
 * - MANTENEDORA: acesso a todas units da mesma mantenedora
 * - STAFF_CENTRAL: acesso às units em unitScopes
 * - UNIDADE_*: acesso apenas à própria unitId
 * - PROFESSOR: acesso apenas à própria unitId
 * 
 * @param user - Payload JWT do usuário autenticado
 * @param targetUnitId - ID da unidade que se deseja acessar
 * @returns true se o usuário tem acesso, false caso contrário
 */
export async function canAccessUnit(
  user: JwtPayload,
  targetUnitId: string,
  loadUnitScopes?: LoadUnitScopesFn,
): Promise<boolean> {
  if (!targetUnitId) {
    return false;
  }

  // 1. DEVELOPER: acesso total
  if (user.roles.some((role) => role.level === RoleLevel.DEVELOPER)) {
    return true;
  }

  // 2. MANTENEDORA: acesso a todas units da mesma mantenedora
  // (validação de mantenedoraId deve ser feita no service)
  if (user.roles.some((role) => role.level === RoleLevel.MANTENEDORA)) {
    return true; // Validação de mantenedora será feita no service
  }

  // 3. STAFF_CENTRAL: verificar unitScopes
  const staffCentralRole = user.roles.find(
    (role) => role.level === RoleLevel.STAFF_CENTRAL,
  );

  if (staffCentralRole) {
    // Coletar todos os unitScopes de todas as roles
    const allUnitScopes: string[] = [];
    for (const role of user.roles) {
      if (role.unitScopes && role.unitScopes.length > 0) {
        allUnitScopes.push(...role.unitScopes);
      }
    }

    // Se tem unitScopes, verificar se targetUnitId está neles
    if (allUnitScopes.length > 0) {
      return allUnitScopes.includes(targetUnitId);
    }

    // Fallback: carregar escopos ativos do banco quando token vier sem unitScopes
    if (loadUnitScopes) {
      const dbUnitScopes = await loadUnitScopes({ userId: user.sub });
      if (dbUnitScopes.length > 0) {
        return dbUnitScopes.includes(targetUnitId);
      }
    }

    // Se STAFF_CENTRAL sem unitScopes, negar acesso
    return false;
  }

  // 4. UNIDADE_* ou PROFESSOR: apenas a própria unitId
  if (user.unitId) {
    return user.unitId === targetUnitId;
  }

  // Caso padrão: sem acesso
  return false;
}
