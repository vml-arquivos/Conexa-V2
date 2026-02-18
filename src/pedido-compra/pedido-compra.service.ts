import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/services/audit.service';
import { ConsolidarPedidoDto } from './dto/consolidar-pedido.dto';
import { AtualizarStatusPedidoDto } from './dto/atualizar-status-pedido.dto';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import {
  podeAcessarUnidade,
  podeEditarOperacional,
  garantirNaoSomenteLeitor,
} from '../auth/policies/politicas-acesso';
import {
  RoleLevel,
  StatusPedidoCompra,
  RequestStatus,
  AuditLogAction,
} from '@prisma/client';

@Injectable()
export class PedidoCompraService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────
  // 1. Consolidar requisições aprovadas em um Pedido de Compra mensal
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Consolida todas as MaterialRequests APROVADAS do mês/unidade em um
   * PedidoCompra. Operação idempotente: se já existir pedido para
   * unidade+mês, atualiza os itens sem duplicar.
   *
   * RBAC: UNIDADE (própria), MANTENEDORA, DEVELOPER
   * STAFF_CENTRAL: bloqueado (somente leitura)
   */
  async consolidar(dto: ConsolidarPedidoDto, user: JwtPayload) {
    // Bloquear STAFF_CENTRAL
    garantirNaoSomenteLeitor(user);

    // Determinar unitId
    const unitId = dto.unitId ?? user.unitId;
    if (!unitId) {
      throw new BadRequestException(
        'unitId é obrigatório para consolidar o pedido.',
      );
    }

    // Verificar permissão de edição operacional
    if (!podeEditarOperacional(user, unitId)) {
      throw new ForbiddenException(
        'Acesso negado: você não tem permissão para consolidar pedidos desta unidade.',
      );
    }

    // Verificar que a unidade existe e pertence à mantenedora
    const unit = await this.prisma.unit.findFirst({
      where: { id: unitId, mantenedoraId: user.mantenedoraId },
    });
    if (!unit) {
      throw new NotFoundException('Unidade não encontrada.');
    }

    // Calcular intervalo do mês
    const [ano, mes] = dto.mesReferencia.split('-').map(Number);
    const inicioMes = new Date(ano, mes - 1, 1);
    const fimMes = new Date(ano, mes, 0, 23, 59, 59, 999);

    // Buscar requisições APROVADAS no mês/unidade
    const requisicoes = await this.prisma.materialRequest.findMany({
      where: {
        unitId,
        mantenedoraId: user.mantenedoraId,
        status: RequestStatus.APROVADO,
        createdAt: { gte: inicioMes, lte: fimMes },
      },
      select: {
        id: true,
        type: true,
        title: true,
        description: true,
        quantity: true,
        estimatedCost: true,
      },
    });

    if (requisicoes.length === 0) {
      throw new BadRequestException(
        `Nenhuma requisição aprovada encontrada para ${dto.mesReferencia} na unidade informada.`,
      );
    }

    // Agrupar por categoria + descrição (normalizada)
    const grupos = new Map<
      string,
      {
        categoria: string;
        descricao: string;
        quantidade: number;
        unidadeMedida: string | null;
        custoEstimado: number;
        requisicaoIds: string[];
      }
    >();

    for (const req of requisicoes) {
      const descricaoNormalizada = (req.description ?? req.title).toLowerCase().trim();
      const chave = `${req.type}::${descricaoNormalizada}`;
      if (grupos.has(chave)) {
        const g = grupos.get(chave)!;
        g.quantidade += req.quantity ?? 1;
        g.custoEstimado += req.estimatedCost ?? 0;
        g.requisicaoIds.push(req.id);
      } else {
        grupos.set(chave, {
          categoria: req.type,
          descricao: req.description ?? req.title,
          quantidade: req.quantity ?? 1,
          unidadeMedida: null,
          custoEstimado: req.estimatedCost ?? 0,
          requisicaoIds: [req.id],
        });
      }
    }

    // Verificar se já existe pedido para unidade+mês (idempotência)
    const pedidoExistente = await this.prisma.pedidoCompra.findFirst({
      where: {
        unitId,
        mantenedoraId: user.mantenedoraId,
        mesReferencia: dto.mesReferencia,
        status: {
          notIn: [StatusPedidoCompra.CANCELADO],
        },
      },
    });

    let pedido: { id: string; mesReferencia: string; status: StatusPedidoCompra };

    if (pedidoExistente) {
      // Atualizar pedido existente: remover itens antigos e recriar
      await this.prisma.itemPedidoCompra.deleteMany({
        where: { pedidoCompraId: pedidoExistente.id },
      });

      pedido = await this.prisma.pedidoCompra.update({
        where: { id: pedidoExistente.id },
        data: {
          observacoes: dto.observacoes ?? pedidoExistente.observacoes,
          consolidadoPor: user.sub,
          status: StatusPedidoCompra.RASCUNHO,
          itens: {
            create: Array.from(grupos.values()).map((g) => ({
              categoria: g.categoria as any,
              descricao: g.descricao,
              quantidade: g.quantidade,
              unidadeMedida: g.unidadeMedida,
              custoEstimado: g.custoEstimado > 0 ? g.custoEstimado : null,
              requisicaoIds: g.requisicaoIds,
            })),
          },
        },
        select: { id: true, mesReferencia: true, status: true },
      });
    } else {
      // Criar novo pedido
      pedido = await this.prisma.pedidoCompra.create({
        data: {
          mantenedoraId: user.mantenedoraId,
          unitId,
          mesReferencia: dto.mesReferencia,
          observacoes: dto.observacoes,
          consolidadoPor: user.sub,
          status: StatusPedidoCompra.RASCUNHO,
          itens: {
            create: Array.from(grupos.values()).map((g) => ({
              categoria: g.categoria as any,
              descricao: g.descricao,
              quantidade: g.quantidade,
              unidadeMedida: g.unidadeMedida,
              custoEstimado: g.custoEstimado > 0 ? g.custoEstimado : null,
              requisicaoIds: g.requisicaoIds,
            })),
          },
        },
        select: { id: true, mesReferencia: true, status: true },
      });
    }

    // Auditoria
    await this.audit.log({
      action: AuditLogAction.CREATE,
      entity: 'PEDIDO_COMPRA',
      entityId: pedido.id,
      userId: user.sub,
      mantenedoraId: user.mantenedoraId,
      unitId,
      description: `Pedido de compra consolidado para ${dto.mesReferencia} com ${grupos.size} itens`,
    });

    return {
      pedidoId: pedido.id,
      mesReferencia: pedido.mesReferencia,
      status: pedido.status,
      totalItens: grupos.size,
      totalRequisicoes: requisicoes.length,
      mensagem: pedidoExistente
        ? 'Pedido de compra atualizado com sucesso.'
        : 'Pedido de compra criado com sucesso.',
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 2. Listar pedidos de compra
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Lista pedidos de compra com filtros opcionais.
   *
   * RBAC:
   * - MANTENEDORA/DEVELOPER: vê todos da mantenedora
   * - STAFF_CENTRAL: vê apenas unidades no escopo (somente leitura)
   * - UNIDADE: vê apenas da própria unidade
   * - PROFESSOR: bloqueado
   */
  async listar(
    user: JwtPayload,
    filtros: {
      mesReferencia?: string;
      unitId?: string;
      status?: StatusPedidoCompra;
    },
  ) {
    const where: Record<string, unknown> = {
      mantenedoraId: user.mantenedoraId,
    };

    // Aplicar escopo por role
    if (user.roles.some((r) => r.level === RoleLevel.PROFESSOR)) {
      throw new ForbiddenException(
        'Acesso negado: professores não têm acesso a pedidos de compra.',
      );
    }

    if (user.roles.some((r) => r.level === RoleLevel.UNIDADE)) {
      where['unitId'] = user.unitId;
    } else if (user.roles.some((r) => r.level === RoleLevel.STAFF_CENTRAL)) {
      const staffRole = user.roles.find(
        (r) => r.level === RoleLevel.STAFF_CENTRAL,
      );
      where['unitId'] = { in: staffRole?.unitScopes ?? [] };
    }

    // Aplicar filtros adicionais
    if (filtros.unitId) {
      // Verificar permissão para o unitId solicitado
      if (!podeAcessarUnidade(user, filtros.unitId)) {
        throw new ForbiddenException(
          'Acesso negado: você não tem permissão para acessar pedidos desta unidade.',
        );
      }
      where['unitId'] = filtros.unitId;
    }

    if (filtros.mesReferencia) where['mesReferencia'] = filtros.mesReferencia;
    if (filtros.status) where['status'] = filtros.status;

    const pedidos = await this.prisma.pedidoCompra.findMany({
      where,
      include: {
        unit: { select: { id: true, name: true } },
        itens: {
          select: {
            id: true,
            categoria: true,
            descricao: true,
            quantidade: true,
            unidadeMedida: true,
            custoEstimado: true,
          },
        },
      },
      orderBy: [{ mesReferencia: 'desc' }, { criadoEm: 'desc' }],
    });

    return pedidos;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 3. Atualizar status do pedido
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Atualiza o status de um Pedido de Compra.
   *
   * RBAC:
   * - MANTENEDORA/DEVELOPER: pode mudar para qualquer status
   * - UNIDADE: pode ENVIAR (RASCUNHO → ENVIADO) ou CANCELAR
   * - STAFF_CENTRAL: bloqueado
   * - PROFESSOR: bloqueado
   *
   * Transições permitidas:
   *   RASCUNHO → ENVIADO (unidade)
   *   ENVIADO → EM_ANALISE → COMPRADO → EM_ENTREGA → ENTREGUE (mantenedora)
   *   Qualquer → CANCELADO (unidade ou mantenedora)
   */
  async atualizarStatus(
    id: string,
    dto: AtualizarStatusPedidoDto,
    user: JwtPayload,
  ) {
    // Bloquear STAFF_CENTRAL e PROFESSOR
    if (
      user.roles.some(
        (r) =>
          r.level === RoleLevel.STAFF_CENTRAL ||
          r.level === RoleLevel.PROFESSOR,
      )
    ) {
      throw new ForbiddenException(
        'Acesso negado: você não tem permissão para alterar o status de pedidos de compra.',
      );
    }

    const pedido = await this.prisma.pedidoCompra.findFirst({
      where: { id, mantenedoraId: user.mantenedoraId },
    });

    if (!pedido) {
      throw new NotFoundException('Pedido de compra não encontrado.');
    }

    // Verificar permissão por unitId
    const isMantenedora = user.roles.some(
      (r) =>
        r.level === RoleLevel.MANTENEDORA || r.level === RoleLevel.DEVELOPER,
    );
    const isUnidade = user.roles.some((r) => r.level === RoleLevel.UNIDADE);

    if (!isMantenedora && isUnidade) {
      // Unidade só pode ENVIAR ou CANCELAR o próprio pedido
      if (pedido.unitId !== user.unitId) {
        throw new ForbiddenException(
          'Acesso negado: você só pode alterar pedidos da sua unidade.',
        );
      }
      const statusPermitidosUnidade: StatusPedidoCompra[] = [
        StatusPedidoCompra.ENVIADO,
        StatusPedidoCompra.CANCELADO,
      ];
      if (!statusPermitidosUnidade.includes(dto.status)) {
        throw new ForbiddenException(
          `Unidade pode apenas enviar (ENVIADO) ou cancelar (CANCELADO) o pedido. Status solicitado: ${dto.status}`,
        );
      }
    }

    // Atualizar status
    const dadosAtualizacao: Record<string, unknown> = {
      status: dto.status,
      observacoes: dto.observacoes ?? pedido.observacoes,
    };

    if (dto.status === StatusPedidoCompra.ENVIADO) {
      dadosAtualizacao['enviadoEm'] = new Date();
    }
    if (dto.status === StatusPedidoCompra.ENTREGUE) {
      dadosAtualizacao['entregueEm'] = new Date();
    }

    const pedidoAtualizado = await this.prisma.pedidoCompra.update({
      where: { id },
      data: dadosAtualizacao,
      select: {
        id: true,
        mesReferencia: true,
        status: true,
        unitId: true,
        enviadoEm: true,
        entregueEm: true,
      },
    });

    // Auditoria
    await this.audit.log({
      action: AuditLogAction.UPDATE,
      entity: 'PEDIDO_COMPRA',
      entityId: id,
      userId: user.sub,
      mantenedoraId: user.mantenedoraId,
      unitId: pedido.unitId,
      description: `Status do pedido alterado para ${dto.status}`,
    });

    return pedidoAtualizado;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 4. Buscar pedido por ID
  // ─────────────────────────────────────────────────────────────────────────

  async buscarPorId(id: string, user: JwtPayload) {
    const pedido = await this.prisma.pedidoCompra.findFirst({
      where: { id, mantenedoraId: user.mantenedoraId },
      include: {
        unit: { select: { id: true, name: true } },
        itens: true,
      },
    });

    if (!pedido) {
      throw new NotFoundException('Pedido de compra não encontrado.');
    }

    // Verificar permissão de acesso
    if (!podeAcessarUnidade(user, pedido.unitId)) {
      throw new ForbiddenException(
        'Acesso negado: você não tem permissão para visualizar este pedido.',
      );
    }

    return pedido;
  }
}
