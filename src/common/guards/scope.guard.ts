import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { RoleLevel } from '@prisma/client';
import type { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * ScopeGuard: Valida se o usuário tem acesso ao recurso baseado no escopo multi-tenant
 *
 * Hierarquia de escopo:
 * - DEVELOPER: Acesso total (bypass)
 * - MANTENEDORA: Acesso a todos os dados da mantenedora
 * - STAFF_CENTRAL: Acesso às unidades vinculadas via UserRoleUnitScope
 * - UNIDADE: Acesso apenas à sua unidade
 * - PROFESSOR: Acesso apenas às suas turmas
 *
 * Para usar este guard, a rota deve incluir os seguintes parâmetros:
 * - mantenedoraId (sempre)
 * - unitId (quando aplicável)
 * - classroomId (quando aplicável)
 */
@Injectable()
export class ScopeGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user: JwtPayload = request.user;

    if (!user) {
      return false;
    }

    // DEVELOPER tem acesso total (bypass)
    if (user.roles.some((role) => role.level === RoleLevel.DEVELOPER)) {
      return true;
    }

    // Extrair IDs do recurso sendo acessado (params, query ou body)
    const resourceMantenedoraId =
      request.params?.mantenedoraId ||
      request.query?.mantenedoraId ||
      request.body?.mantenedoraId;

    const resourceUnitId =
      request.params?.unitId || request.query?.unitId || request.body?.unitId;

    const resourceClassroomId =
      request.params?.classroomId ||
      request.query?.classroomId ||
      request.body?.classroomId;

    // Validar escopo de mantenedora
    if (resourceMantenedoraId && user.mantenedoraId !== resourceMantenedoraId) {
      throw new ForbiddenException(
        'Acesso negado: você não tem permissão para acessar dados desta mantenedora',
      );
    }

    // Validar escopo de unidade
    if (resourceUnitId) {
      const hasAccessToUnit = await this.hasAccessToUnit(user, resourceUnitId);
      if (!hasAccessToUnit) {
        throw new ForbiddenException(
          'Acesso negado: você não tem permissão para acessar dados desta unidade',
        );
      }
    }

    // Validar escopo de turma (para professores)
    if (resourceClassroomId) {
      const hasAccessToClassroom = await this.hasAccessToClassroom(
        user,
        resourceClassroomId,
      );
      if (!hasAccessToClassroom) {
        throw new ForbiddenException(
          'Acesso negado: você não tem permissão para acessar dados desta turma',
        );
      }
    }

    return true;
  }

  /**
   * Verifica se o usuário tem acesso a uma unidade específica
   */
  private async hasAccessToUnit(
    user: JwtPayload,
    unitId: string,
  ): Promise<boolean> {
    // MANTENEDORA tem acesso a todas as unidades da sua mantenedora
    if (user.roles.some((role) => role.level === RoleLevel.MANTENEDORA)) {
      const unit = await this.prisma.unit.findUnique({
        where: { id: unitId },
        select: { mantenedoraId: true },
      });
      return unit?.mantenedoraId === user.mantenedoraId;
    }

    // STAFF_CENTRAL tem acesso apenas às unidades vinculadas
    if (user.roles.some((role) => role.level === RoleLevel.STAFF_CENTRAL)) {
      const staffCentralRole = user.roles.find(
        (role) => role.level === RoleLevel.STAFF_CENTRAL,
      );
      return staffCentralRole?.unitScopes.includes(unitId) || false;
    }

    // UNIDADE e PROFESSOR têm acesso apenas à sua unidade
    if (
      user.roles.some(
        (role) =>
          role.level === RoleLevel.UNIDADE ||
          role.level === RoleLevel.PROFESSOR,
      )
    ) {
      return user.unitId === unitId;
    }

    return false;
  }

  /**
   * Verifica se o usuário (professor) tem acesso a uma turma específica
   */
  private async hasAccessToClassroom(
    user: JwtPayload,
    classroomId: string,
  ): Promise<boolean> {
    // MANTENEDORA, STAFF_CENTRAL e UNIDADE têm acesso a todas as turmas da unidade
    if (
      user.roles.some(
        (role) =>
          role.level === RoleLevel.MANTENEDORA ||
          role.level === RoleLevel.STAFF_CENTRAL ||
          role.level === RoleLevel.UNIDADE,
      )
    ) {
      // Validação de unidade já foi feita anteriormente
      return true;
    }

    // PROFESSOR tem acesso apenas às suas turmas
    if (user.roles.some((role) => role.level === RoleLevel.PROFESSOR)) {
      const classroomTeacher = await this.prisma.classroomTeacher.findFirst({
        where: {
          classroomId,
          teacherId: user.sub,
          isActive: true,
        },
      });
      return !!classroomTeacher;
    }

    return false;
  }
}
