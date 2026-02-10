import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMaterialRequestDto, MaterialRequestTypeInput } from './dto/create-material-request.dto';
import { ReviewDecision, ReviewMaterialRequestDto } from './dto/review-material-request.dto';
import { MaterialRequestType, RequestStatus, RoleLevel } from '@prisma/client';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

function mapType(input: MaterialRequestTypeInput): MaterialRequestType {
  const e: any = MaterialRequestType as any;
  // compat: schema pode ter HIGIENE/PEDAGOGICO (pt) ou HYGIENE/PEDAGOGICAL (en)
  if (input === MaterialRequestTypeInput.HYGIENE) return e.HYGIENE ?? e.HIGIENE ?? Object.values(e)[0];
  if (input === MaterialRequestTypeInput.PEDAGOGICAL) return e.PEDAGOGICAL ?? e.PEDAGOGICO ?? Object.values(e)[0];
  return Object.values(e)[0] as MaterialRequestType;
}

@Injectable()
export class MaterialRequestService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateMaterialRequestDto, user: JwtPayload) {
    if (!user?.mantenedoraId || !user?.unitId) throw new ForbiddenException('Escopo inválido');

    // Professor cria
    const isProfessor = Array.isArray(user.roles) && user.roles.some((r: any) => r?.level === RoleLevel.PROFESSOR || r?.level === RoleLevel.DEVELOPER);
    if (!isProfessor) throw new ForbiddenException('Apenas PROFESSOR pode solicitar');

    const code = `MR-${Date.now()}`;
    const description = dto.childId ? `childId=${dto.childId}` : undefined;

    return this.prisma.materialRequest.create({
      data: {
        mantenedoraId: user.mantenedoraId,
        unitId: user.unitId,
        code,
        title: dto.item,
        description,
        type: mapType(dto.type),
        quantity: dto.quantity,
        status: RequestStatus.SOLICITADO,
        createdBy: user.sub,
      },
    });
  }

  async list(user: JwtPayload) {
    if (!user?.mantenedoraId || !user?.unitId) throw new ForbiddenException('Escopo inválido');

    // Coordenador vê tudo da unidade
    const isCoord = Array.isArray(user.roles) && user.roles.some((r: any) => r?.level === RoleLevel.UNIDADE || r?.level === RoleLevel.DEVELOPER);
    if (!isCoord) throw new ForbiddenException('Apenas COORDENADOR pode listar');

    return this.prisma.materialRequest.findMany({
      where: { mantenedoraId: user.mantenedoraId, unitId: user.unitId },
      orderBy: { requestedDate: 'desc' },
      take: 200,
    });
  }

  async review(id: string, dto: ReviewMaterialRequestDto, user: JwtPayload) {
    if (!user?.mantenedoraId || !user?.unitId) throw new ForbiddenException('Escopo inválido');

    const isCoord = Array.isArray(user.roles) && user.roles.some((r: any) => r?.level === RoleLevel.UNIDADE || r?.level === RoleLevel.DEVELOPER);
    if (!isCoord) throw new ForbiddenException('Apenas COORDENADOR pode aprovar/rejeitar');

    const req = await this.prisma.materialRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('Solicitação não encontrada');
    if (req.mantenedoraId !== user.mantenedoraId || req.unitId !== user.unitId) throw new ForbiddenException('Fora do escopo');

    const status = dto.decision === ReviewDecision.APPROVED ? RequestStatus.APROVADO : RequestStatus.REJEITADO;

    return this.prisma.materialRequest.update({
      where: { id },
      data: { status, approvedBy: user.sub, approvedDate: new Date() },
    });
  }
}
