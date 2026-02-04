import { RoleLevel } from '@prisma/client';

export interface JwtPayload {
  sub: string; // userId
  email: string;
  mantenedoraId: string;
  unitId?: string;
  roles: {
    roleId: string;
    level: RoleLevel;
    unitScopes: string[]; // Array de unitIds que o usuário tem acesso
  }[];
}

export interface JwtPayloadWithRefresh extends JwtPayload {
  refreshToken?: string;
}
