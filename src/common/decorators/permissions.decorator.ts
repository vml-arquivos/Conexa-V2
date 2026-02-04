import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Decorator para definir as permissões necessárias para acessar uma rota
 * @param permissions - Array de permissões no formato "resource:action" (ex: "children:read", "planning:create")
 */
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
