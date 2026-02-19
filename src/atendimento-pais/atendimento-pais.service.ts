import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StatusAtendimento } from '@prisma/client';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CreateAtendimentoDto } from './dto/create-atendimento.dto';

@Injectable()
export class AtendimentoPaisService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Cria um novo atendimento com pais/responsáveis
   */
  async criar(dto: CreateAtendimentoDto, user: JwtPayload) {
    if (!user.mantenedoraId) {
      throw new ForbiddenException('Escopo de mantenedora ausente');
    }

    // Verificar se a criança pertence à mantenedora do usuário
    const child = await this.prisma.child.findFirst({
      where: {
        id: dto.childId,
        mantenedoraId: user.mantenedoraId,
      },
      select: { id: true, unitId: true },
    });

    if (!child) {
      throw new NotFoundException('Criança não encontrada ou sem acesso');
    }

    return this.prisma.atendimentoPais.create({
      data: {
        mantenedoraId: user.mantenedoraId,
        unitId: child.unitId || user.unitId || '',
        childId: dto.childId,
        responsavelNome: dto.responsavelNome,
        responsavelRelacao: dto.responsavelRelacao,
        responsavelContato: dto.responsavelContato,
        tipo: dto.tipo,
        dataAtendimento: new Date(dto.dataAtendimento),
        atendidoPorId: user.sub,
        assunto: dto.assunto,
        descricao: dto.descricao,
        encaminhamento: dto.encaminhamento,
        retornoNecessario: dto.retornoNecessario ?? false,
        dataRetorno: dto.dataRetorno ? new Date(dto.dataRetorno) : undefined,
      },
      include: {
        child: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });
  }

  /**
   * Lista atendimentos com filtros multi-tenant
   */
  async listar(
    user: JwtPayload,
    filtros?: {
      childId?: string;
      status?: StatusAtendimento;
      unitId?: string;
    },
  ) {
    if (!user.mantenedoraId) {
      throw new ForbiddenException('Escopo de mantenedora ausente');
    }

    const where: Record<string, unknown> = {
      mantenedoraId: user.mantenedoraId,
    };

    // Filtros opcionais
    if (filtros?.childId) where.childId = filtros.childId;
    if (filtros?.status) where.status = filtros.status;

    // Restrição por unitId para roles não-globais
    const isGlobal = user.roles.some((r) =>
      ['DEVELOPER', 'MANTENEDORA', 'STAFF_CENTRAL'].includes(r.level),
    );
    if (!isGlobal && user.unitId) {
      where.unitId = filtros?.unitId || user.unitId;
    } else if (filtros?.unitId) {
      where.unitId = filtros.unitId;
    }

    return this.prisma.atendimentoPais.findMany({
      where,
      include: {
        child: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { dataAtendimento: 'desc' },
      take: 100,
    });
  }

  /**
   * Atualiza o status de um atendimento
   */
  async atualizarStatus(
    id: string,
    status: StatusAtendimento,
    user: JwtPayload,
  ) {
    const atendimento = await this.prisma.atendimentoPais.findFirst({
      where: { id, mantenedoraId: user.mantenedoraId },
    });

    if (!atendimento) {
      throw new NotFoundException('Atendimento não encontrado');
    }

    return this.prisma.atendimentoPais.update({
      where: { id },
      data: { status },
    });
  }
}
