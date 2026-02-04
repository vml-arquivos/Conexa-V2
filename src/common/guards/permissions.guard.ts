import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoleLevel } from '@prisma/client';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true; // Sem restrição de permissões
    }

    const request = context.switchToHttp().getRequest();
    const user: JwtPayload = request.user;

    if (!user || !user.roles) {
      return false;
    }

    // DEVELOPER tem acesso total (bypass)
    if (user.roles.some((role) => role.level === RoleLevel.DEVELOPER)) {
      return true;
    }

    // Buscar as permissões dos roles do usuário
    const userRoleIds = user.roles.map((role) => role.roleId);

    const rolePermissions = await this.prisma.rolePermission.findMany({
      where: {
        roleId: { in: userRoleIds },
      },
      include: {
        permission: true,
      },
    });

    // Extrair as permissões no formato "resource:action"
    const userPermissions = rolePermissions.map(
      (rp) => `${rp.permission.resource}:${rp.permission.action}`,
    );

    // Verificar se o usuário tem todas as permissões necessárias
    return requiredPermissions.every((permission) =>
      userPermissions.includes(permission),
    );
  }
}
