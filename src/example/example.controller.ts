import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { RoleLevel } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { ScopeGuard } from '../common/guards/scope.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequireRoles } from '../common/decorators/roles.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { Public } from '../common/decorators/public.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@Controller('example')
export class ExampleController {
  /**
   * Rota pública - não requer autenticação
   */
  @Public()
  @Get('public')
  getPublic() {
    return {
      message: 'Esta é uma rota pública, acessível sem autenticação',
    };
  }

  /**
   * Rota protegida - requer apenas autenticação
   */
  @UseGuards(JwtAuthGuard)
  @Get('protected')
  getProtected(@CurrentUser() user: JwtPayload) {
    return {
      message: 'Você está autenticado!',
      user: {
        id: user.sub,
        email: user.email,
        mantenedoraId: user.mantenedoraId,
        roles: user.roles,
      },
    };
  }

  /**
   * Rota restrita a DEVELOPER
   * Caso de uso: Acesso total sistêmico
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequireRoles(RoleLevel.DEVELOPER)
  @Get('developer-only')
  getDeveloperOnly(@CurrentUser() user: JwtPayload) {
    return {
      message: 'Acesso exclusivo para DEVELOPER (bypass sistêmico)',
      user: user.email,
    };
  }

  /**
   * Rota restrita a MANTENEDORA
   * Caso de uso: Gestão administrativa global
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequireRoles(RoleLevel.MANTENEDORA)
  @Get('mantenedora-only')
  getMantenedoraOnly(@CurrentUser() user: JwtPayload) {
    return {
      message: 'Acesso exclusivo para MANTENEDORA',
      mantenedoraId: user.mantenedoraId,
    };
  }

  /**
   * Rota restrita a STAFF_CENTRAL
   * Caso de uso: Coordenação pedagógica geral e psicologia
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequireRoles(RoleLevel.STAFF_CENTRAL)
  @Get('staff-central-only')
  getStaffCentralOnly(@CurrentUser() user: JwtPayload) {
    const staffRole = user.roles.find(
      (r) => r.level === RoleLevel.STAFF_CENTRAL,
    );
    return {
      message: 'Acesso exclusivo para STAFF_CENTRAL',
      unitScopes: staffRole?.unitScopes || [],
    };
  }

  /**
   * Rota restrita a UNIDADE (Direção, Coordenação, Admin, Nutrição)
   * Caso de uso: Direção acessa tudo da unidade
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequireRoles(RoleLevel.UNIDADE)
  @Get('unidade-only')
  getUnidadeOnly(@CurrentUser() user: JwtPayload) {
    return {
      message: 'Acesso exclusivo para UNIDADE (Direção, Coordenação, etc.)',
      unitId: user.unitId,
    };
  }

  /**
   * Rota restrita a PROFESSOR
   * Caso de uso: Professor só acessa suas turmas
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequireRoles(RoleLevel.PROFESSOR)
  @Get('professor-only')
  getProfessorOnly(@CurrentUser() user: JwtPayload) {
    return {
      message: 'Acesso exclusivo para PROFESSOR',
      unitId: user.unitId,
      note: 'Acesso limitado às turmas em que leciona',
    };
  }

  /**
   * Rota com validação de PERMISSÃO específica
   * Caso de uso: Apenas quem tem permissão "children:read" pode acessar
   */
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('children:read')
  @Get('with-permission')
  getWithPermission(@CurrentUser() user: JwtPayload) {
    return {
      message: 'Você tem a permissão "children:read"',
      user: user.email,
    };
  }

  /**
   * Rota com validação de ESCOPO MULTI-TENANT (Mantenedora)
   * Caso de uso: Acesso a dados de uma mantenedora específica
   */
  @UseGuards(JwtAuthGuard, ScopeGuard)
  @Get('mantenedora/:mantenedoraId/data')
  getMantenedoraData(
    @Param('mantenedoraId') mantenedoraId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return {
      message: `Acesso aos dados da mantenedora ${mantenedoraId}`,
      userMantenedoraId: user.mantenedoraId,
      note: 'ScopeGuard validou que você tem acesso a esta mantenedora',
    };
  }

  /**
   * Rota com validação de ESCOPO MULTI-TENANT (Unidade)
   * Caso de uso: Acesso a dados de uma unidade específica
   */
  @UseGuards(JwtAuthGuard, ScopeGuard)
  @Get('unidade/:unitId/data')
  getUnitData(
    @Param('unitId') unitId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return {
      message: `Acesso aos dados da unidade ${unitId}`,
      userUnitId: user.unitId,
      note: 'ScopeGuard validou que você tem acesso a esta unidade',
    };
  }

  /**
   * Rota com validação de ESCOPO MULTI-TENANT (Turma)
   * Caso de uso: Professor acessa apenas suas turmas
   */
  @UseGuards(JwtAuthGuard, RolesGuard, ScopeGuard)
  @RequireRoles(RoleLevel.PROFESSOR, RoleLevel.UNIDADE)
  @Get('classroom/:classroomId/data')
  getClassroomData(
    @Param('classroomId') classroomId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return {
      message: `Acesso aos dados da turma ${classroomId}`,
      note: 'ScopeGuard validou que você tem acesso a esta turma',
    };
  }

  /**
   * Rota COMPLETA: Roles + Permissions + Scope
   * Caso de uso: Apenas Direção/Coordenação com permissão específica pode acessar dados da unidade
   */
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, ScopeGuard)
  @RequireRoles(RoleLevel.UNIDADE)
  @RequirePermissions('planning:read')
  @Get('unidade/:unitId/plannings')
  getUnitPlannings(
    @Param('unitId') unitId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return {
      message: `Planejamentos da unidade ${unitId}`,
      note: 'Validado: Role UNIDADE + Permissão planning:read + Escopo de unidade',
    };
  }
}
