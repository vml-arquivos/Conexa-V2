import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/services/audit.service';
import { CreatePlanningTemplateDto } from './dto/create-planning-template.dto';
import { UpdatePlanningTemplateDto } from './dto/update-planning-template.dto';
import { QueryPlanningTemplateDto } from './dto/query-planning-template.dto';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { RoleLevel } from '@prisma/client';

@Injectable()
export class PlanningTemplateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Cria um novo template de planejamento
   * Apenas Mantenedora e Staff Central podem criar
   */
  async create(createDto: CreatePlanningTemplateDto, user: JwtPayload) {
    // Validar permissão
    this.validateCreatePermission(user);

    // Usar mantenedoraId do usuário se não fornecido
    const mantenedoraId = createDto.mantenedoraId || user.mantenedoraId;

    // Validar se o usuário tem acesso à mantenedora
    if (
      !user.roles.some((role) => role.level === RoleLevel.DEVELOPER) &&
      mantenedoraId !== user.mantenedoraId
    ) {
      throw new ForbiddenException(
        'Você não tem permissão para criar templates para esta mantenedora',
      );
    }

    const template = await this.prisma.planningTemplate.create({
      data: {
        name: createDto.name,
        description: createDto.description,
        type: createDto.type,
        sections: createDto.sections,
        fields: createDto.fields,
        mantenedoraId,
        createdBy: user.sub,
      },
      include: {
        createdByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Registrar auditoria
    await this.auditService.logCreate(
      'PlanningTemplate',
      template.id,
      user.sub,
      mantenedoraId,
      undefined,
      template,
    );

    return template;
  }

  /**
   * Lista templates com filtros
   */
  async findAll(query: QueryPlanningTemplateDto, user: JwtPayload) {
    const where: any = {
      deletedAt: null,
    };

    // Filtro por escopo do usuário
    if (!user.roles.some((role) => role.level === RoleLevel.DEVELOPER)) {
      where.mantenedoraId = user.mantenedoraId;
    }

    // Aplicar filtros da query
    if (query.mantenedoraId) {
      where.mantenedoraId = query.mantenedoraId;
    }

    if (query.type) {
      where.type = query.type;
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const templates = await this.prisma.planningTemplate.findMany({
      where,
      include: {
        createdByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        _count: {
          select: {
            plannings: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return templates;
  }

  /**
   * Busca um template por ID
   */
  async findOne(id: string, user: JwtPayload) {
    const template = await this.prisma.planningTemplate.findUnique({
      where: { id },
      include: {
        createdByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        _count: {
          select: {
            plannings: true,
          },
        },
      },
    });

    if (!template || template.deletedAt) {
      throw new NotFoundException('Template não encontrado');
    }

    // Validar acesso
    this.validateAccess(template, user);

    return template;
  }

  /**
   * Atualiza um template
   */
  async update(
    id: string,
    updateDto: UpdatePlanningTemplateDto,
    user: JwtPayload,
  ) {
    const template = await this.prisma.planningTemplate.findUnique({
      where: { id },
    });

    if (!template || template.deletedAt) {
      throw new NotFoundException('Template não encontrado');
    }

    // Validar acesso
    this.validateAccess(template, user);

    // Validar permissão de edição
    this.validateEditPermission(template, user);

    const updatedTemplate = await this.prisma.planningTemplate.update({
      where: { id },
      data: {
        ...(updateDto.name && { name: updateDto.name }),
        ...(updateDto.description && { description: updateDto.description }),
        ...(updateDto.type && { type: updateDto.type }),
        ...(updateDto.sections && { sections: updateDto.sections }),
        ...(updateDto.fields && { fields: updateDto.fields }),
      },
      include: {
        createdByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Registrar auditoria
    await this.auditService.logUpdate(
      'PlanningTemplate',
      id,
      user.sub,
      template.mantenedoraId,
      undefined,
      template,
      updatedTemplate,
    );

    return updatedTemplate;
  }

  /**
   * Remove um template (soft delete)
   */
  async remove(id: string, user: JwtPayload) {
    const template = await this.prisma.planningTemplate.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            plannings: true,
          },
        },
      },
    });

    if (!template || template.deletedAt) {
      throw new NotFoundException('Template não encontrado');
    }

    // Validar acesso
    this.validateAccess(template, user);

    // Validar permissão de deleção
    this.validateEditPermission(template, user);

    // Verificar se há planejamentos usando este template
    if (template._count.plannings > 0) {
      throw new ForbiddenException(
        `Não é possível deletar este template pois existem ${template._count.plannings} planejamento(s) vinculado(s)`,
      );
    }

    await this.prisma.planningTemplate.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });

    // Registrar auditoria
    await this.auditService.logDelete(
      'PlanningTemplate',
      id,
      user.sub,
      template.mantenedoraId,
      undefined,
      template,
    );

    return { message: 'Template deletado com sucesso' };
  }

  /**
   * Valida se o usuário tem permissão para criar templates
   */
  private validateCreatePermission(user: JwtPayload): void {
    const canCreate = user.roles.some(
      (role) =>
        role.level === RoleLevel.DEVELOPER ||
        role.level === RoleLevel.MANTENEDORA ||
        role.level === RoleLevel.STAFF_CENTRAL,
    );

    if (!canCreate) {
      throw new ForbiddenException(
        'Apenas Mantenedora e Coordenação Geral podem criar templates',
      );
    }
  }

  /**
   * Valida se o usuário tem permissão para editar/deletar templates
   */
  private validateEditPermission(template: any, user: JwtPayload): void {
    const canEdit = user.roles.some(
      (role) =>
        role.level === RoleLevel.DEVELOPER ||
        role.level === RoleLevel.MANTENEDORA ||
        (role.level === RoleLevel.STAFF_CENTRAL &&
          template.createdBy === user.sub),
    );

    if (!canEdit) {
      throw new ForbiddenException(
        'Você não tem permissão para editar este template',
      );
    }
  }

  /**
   * Valida se o usuário tem acesso ao template
   */
  private validateAccess(template: any, user: JwtPayload): void {
    if (user.roles.some((role) => role.level === RoleLevel.DEVELOPER)) {
      return;
    }

    if (template.mantenedoraId !== user.mantenedoraId) {
      throw new ForbiddenException('Acesso negado a este template');
    }
  }
}
