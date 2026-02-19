import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMaterialRequestDto, MaterialRequestTypeInput } from './dto/create-material-request.dto';
import { ReviewDecision, ReviewMaterialRequestDto } from './dto/review-material-request.dto';
import { MaterialRequestType, RequestStatus, RoleLevel } from '@prisma/client';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

function mapType(input?: MaterialRequestTypeInput): MaterialRequestType {
  if (!input) return 'OUTRO' as MaterialRequestType;
  const map: Record<string, string> = {
    HIGIENE: 'HIGIENE',
    LIMPEZA: 'LIMPEZA',
    PEDAGOGICO: 'PEDAGOGICO',
    ALIMENTACAO: 'ALIMENTACAO',
    OUTRO: 'OUTRO',
    HYGIENE: 'HIGIENE',
    PEDAGOGICAL: 'PEDAGOGICO',
  };
  const mapped = map[input];
  if (mapped && (MaterialRequestType as Record<string, string>)[mapped]) {
    return (MaterialRequestType as Record<string, string>)[mapped] as MaterialRequestType;
  }
  return 'OUTRO' as MaterialRequestType;
}

function isProfessorRole(user: JwtPayload): boolean {
  return (
    Array.isArray(user.roles) &&
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    user.roles.some((r: any) => r?.level === RoleLevel.PROFESSOR || r?.level === RoleLevel.DEVELOPER)
  );
}

function isCoordRole(user: JwtPayload): boolean {
  return (
    Array.isArray(user.roles) &&
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    user.roles.some((r: any) => r?.level === RoleLevel.UNIDADE || r?.level === RoleLevel.DEVELOPER)
  );
}

@Injectable()
export class MaterialRequestService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateMaterialRequestDto, user: JwtPayload) {
    if (!user?.mantenedoraId || !user?.unitId) throw new ForbiddenException('Escopo inválido');
    if (!isProfessorRole(user)) throw new ForbiddenException('Apenas PROFESSOR pode solicitar');

    const code = `MR-${Date.now()}`;
    const isNewFormat = !!(dto.titulo || dto.itens || dto.categoria);
    const title = dto.titulo || dto.item || 'Requisição de Material';
    const type = mapType(dto.categoria || dto.type);
    const quantity = dto.itens?.[0]?.quantidade ?? dto.quantity ?? 1;

    let description: string | undefined;
    if (isNewFormat && dto.itens && dto.itens.length > 0) {
      description = JSON.stringify({
        itens: dto.itens,
        justificativa: dto.justificativa,
        urgencia: dto.urgencia,
        descricao: dto.descricao,
      });
    } else if (dto.childId) {
      description = `childId=${dto.childId}`;
    }

    const priorityMap: Record<string, string> = { BAIXA: 'baixa', MEDIA: 'normal', ALTA: 'alta' };
    const priority = dto.urgencia ? (priorityMap[dto.urgencia] ?? 'normal') : 'normal';

    return this.prisma.materialRequest.create({
      data: {
        mantenedoraId: user.mantenedoraId,
        unitId: user.unitId,
        classroomId: dto.classroomId ?? null,
        code,
        title,
        description,
        type,
        quantity,
        priority,
        status: RequestStatus.SOLICITADO,
        createdBy: user.sub,
      },
    });
  }

  async listMine(user: JwtPayload) {
    if (!user?.mantenedoraId || !user?.unitId) throw new ForbiddenException('Escopo inválido');
    return this.prisma.materialRequest.findMany({
      where: {
        mantenedoraId: user.mantenedoraId,
        unitId: user.unitId,
        createdBy: user.sub,
      },
      orderBy: { requestedDate: 'desc' },
      take: 100,
    });
  }

  async list(user: JwtPayload) {
    if (!user?.mantenedoraId || !user?.unitId) throw new ForbiddenException('Escopo inválido');
    if (!isCoordRole(user)) throw new ForbiddenException('Apenas COORDENADOR pode listar todas as requisições');
    return this.prisma.materialRequest.findMany({
      where: { mantenedoraId: user.mantenedoraId, unitId: user.unitId },
      orderBy: { requestedDate: 'desc' },
      take: 200,
    });
  }

  async review(id: string, dto: ReviewMaterialRequestDto, user: JwtPayload) {
    if (!user?.mantenedoraId || !user?.unitId) throw new ForbiddenException('Escopo inválido');
    if (!isCoordRole(user)) throw new ForbiddenException('Apenas COORDENADOR pode aprovar/rejeitar');

    const req = await this.prisma.materialRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('Solicitação não encontrada');
    if (req.mantenedoraId !== user.mantenedoraId || req.unitId !== user.unitId) {
      throw new ForbiddenException('Fora do escopo');
    }

    const status = dto.decision === ReviewDecision.APPROVED ? RequestStatus.APROVADO : RequestStatus.REJEITADO;
    return this.prisma.materialRequest.update({
      where: { id },
      data: { status, approvedBy: user.sub, approvedDate: new Date() },
    });
  }
}
