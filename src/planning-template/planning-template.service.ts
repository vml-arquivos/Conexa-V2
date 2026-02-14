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
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
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

    // Templates não têm escopo de mantenedora no schema atual

    const template = await this.prisma.planningTemplate.create({
      data: {
        name: createDto.name,
        description: createDto.description,
        sections: createDto.sections,
        fields: createDto.fields,
      },
    });

    // Registrar auditoria
    await this.auditService.logCreate(
      'PlanningTemplate',
      template.id,
      user.sub,
      user.mantenedoraId,
      undefined,
      template,
    );

    return template;
  }

  /**
   * Lista templates com filtros
   */
  async findAll(query: QueryPlanningTemplateDto, user: JwtPayload) {
    const where: any = {};

    // Templates não têm escopo de mantenedora no schema atual

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const templates = await this.prisma.planningTemplate.findMany({
      where,
      include: {
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
        _count: {
          select: {
            plannings: true,
          },
        },
      },
    });

    if (!template) {
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

    if (!template) {
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
        ...(updateDto.sections && { sections: updateDto.sections }),
        ...(updateDto.fields && { fields: updateDto.fields }),
      },
    });

    // Registrar auditoria
    await this.auditService.logUpdate(
      'PlanningTemplate',
      id,
      user.sub,
      user.mantenedoraId,
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

    if (!template) {
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
        isActive: false,
      },
    });

    // Registrar auditoria
    await this.auditService.logDelete(
      'PlanningTemplate',
      id,
      user.sub,
      user.mantenedoraId,
      undefined,
      template,
    );

    return { message: 'Template deletado com sucesso' };
  }

  /**
   * Retorna templates padrão COCRIS (sempre 200)
   */
  async getCocrisDefaults() {
    return [
      {
        id: 'cocris-semanal',
        name: 'Planejamento Semanal',
        description: 'Template para planejamento semanal de atividades pedagógicas',
        sections: [
          { id: 'objetivos', title: 'Objetivos da Semana', order: 1 },
          { id: 'segunda', title: 'Segunda-feira', order: 2 },
          { id: 'terca', title: 'Terça-feira', order: 3 },
          { id: 'quarta', title: 'Quarta-feira', order: 4 },
          { id: 'quinta', title: 'Quinta-feira', order: 5 },
          { id: 'sexta', title: 'Sexta-feira', order: 6 },
          { id: 'observacoes', title: 'Observações', order: 7 },
        ],
        fields: [
          { id: 'objetivo', label: 'Objetivo', type: 'textarea', required: true },
          { id: 'atividades', label: 'Atividades', type: 'textarea', required: true },
          { id: 'materiais', label: 'Materiais', type: 'text', required: false },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'cocris-diario-bncc',
        name: 'Planejamento Diário BNCC',
        description: 'Template diário alinhado aos campos de experiência da BNCC',
        sections: [
          { id: 'campo', title: 'Campo de Experiência', order: 1 },
          { id: 'objetivos', title: 'Objetivos de Aprendizagem', order: 2 },
          { id: 'atividade', title: 'Atividade Proposta', order: 3 },
          { id: 'desenvolvimento', title: 'Desenvolvimento', order: 4 },
          { id: 'avaliacao', title: 'Avaliação', order: 5 },
        ],
        fields: [
          { id: 'campo_experiencia', label: 'Campo de Experiência', type: 'select', required: true, options: ['O eu, o outro e o nós', 'Corpo, gestos e movimentos', 'Traços, sons, cores e formas', 'Escuta, fala, pensamento e imaginação', 'Espaços, tempos, quantidades, relações e transformações'] },
          { id: 'objetivo_bncc', label: 'Código BNCC', type: 'text', required: true },
          { id: 'descricao', label: 'Descrição da Atividade', type: 'textarea', required: true },
          { id: 'observacoes', label: 'Observações', type: 'textarea', required: false },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'cocris-reuniao-coordenacao',
        name: 'Reunião Semanal de Coordenação',
        description: 'Template para registro de reuniões de coordenação pedagógica',
        sections: [
          { id: 'pauta', title: 'Pauta', order: 1 },
          { id: 'discussoes', title: 'Discussões', order: 2 },
          { id: 'decisoes', title: 'Decisões', order: 3 },
          { id: 'encaminhamentos', title: 'Encaminhamentos', order: 4 },
        ],
        fields: [
          { id: 'data', label: 'Data', type: 'date', required: true },
          { id: 'participantes', label: 'Participantes', type: 'textarea', required: true },
          { id: 'item', label: 'Item', type: 'text', required: true },
          { id: 'responsavel', label: 'Responsável', type: 'text', required: false },
          { id: 'prazo', label: 'Prazo', type: 'date', required: false },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
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

    // Templates não têm escopo de mantenedora no schema atual
  }
}
