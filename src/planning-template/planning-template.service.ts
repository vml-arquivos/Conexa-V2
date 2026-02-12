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

  /**
   * Retorna templates padrão COCRIS (estático)
   */
  getCocrisDefaults() {
    return [
      {
        id: 'cocris-semanal',
        name: 'Planejamento Semanal',
        description: 'Template para planejamento semanal de atividades pedagógicas (Coordenação + Professor)',
        type: 'SEMANAL',
        sections: [
          {
            title: 'Identificação',
            fields: ['unidade', 'turma', 'professor', 'semana', 'periodo'],
          },
          {
            title: 'Objetivos da Semana',
            fields: ['objetivos_gerais', 'campos_experiencia'],
          },
          {
            title: 'Atividades Planejadas',
            fields: ['segunda', 'terca', 'quarta', 'quinta', 'sexta'],
          },
          {
            title: 'Recursos Necessários',
            fields: ['materiais', 'espacos'],
          },
          {
            title: 'Observações',
            fields: ['observacoes', 'adaptacoes'],
          },
        ],
        isActive: true,
      },
      {
        id: 'cocris-diario-bncc',
        name: 'Planejamento Diário BNCC',
        description: 'Template para planejamento diário alinhado à BNCC (Professor)',
        type: 'DIARIO',
        sections: [
          {
            title: 'Identificação',
            fields: ['data', 'turma', 'professor', 'faixa_etaria'],
          },
          {
            title: 'Campo de Experiência BNCC',
            fields: ['campo_experiencia', 'objetivos_aprendizagem'],
          },
          {
            title: 'Atividade Principal',
            fields: ['titulo', 'descricao', 'duracao', 'materiais'],
          },
          {
            title: 'Desenvolvimento',
            fields: ['introducao', 'desenvolvimento', 'conclusao'],
          },
          {
            title: 'Avaliação',
            fields: ['criterios', 'observacoes_criancas'],
          },
        ],
        isActive: true,
      },
      {
        id: 'cocris-reuniao-coordenacao',
        name: 'Reunião Semanal de Coordenação',
        description: 'Template para registro de reuniões de coordenação pedagógica (pauta + decisões + encaminhamentos)',
        type: 'REUNIAO',
        sections: [
          {
            title: 'Identificação',
            fields: ['data', 'horario', 'participantes', 'facilitador'],
          },
          {
            title: 'Pauta',
            fields: ['temas', 'objetivos_reuniao'],
          },
          {
            title: 'Discussões e Decisões',
            fields: ['pontos_discutidos', 'decisoes_tomadas'],
          },
          {
            title: 'Encaminhamentos',
            fields: ['acoes', 'responsaveis', 'prazos'],
          },
          {
            title: 'Próxima Reunião',
            fields: ['data_proxima', 'pauta_proxima'],
          },
        ],
        isActive: true,
      },
    ];
  }
}
