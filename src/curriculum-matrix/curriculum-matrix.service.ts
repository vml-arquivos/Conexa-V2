import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/services/audit.service';
import { CreateCurriculumMatrixDto } from './dto/create-curriculum-matrix.dto';
import { UpdateCurriculumMatrixDto } from './dto/update-curriculum-matrix.dto';
import { QueryCurriculumMatrixDto } from './dto/query-curriculum-matrix.dto';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@Injectable()
export class CurriculumMatrixService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  /**
   * Criar uma nova Matriz Curricular
   * Apenas Mantenedora e Staff Central podem criar
   */
  async create(createDto: CreateCurriculumMatrixDto, user: JwtPayload) {
    // Validar permissão
    if (
      user.roleLevel !== 'DEVELOPER' &&
      user.roleLevel !== 'MANTENEDORA' &&
      user.roleLevel !== 'STAFF_CENTRAL'
    ) {
      throw new ForbiddenException(
        'Apenas Mantenedora e Staff Central podem criar matrizes curriculares',
      );
    }

    // Verificar se já existe uma matriz com mesmo ano, segmento e versão
    const existing = await this.prisma.curriculumMatrix.findFirst({
      where: {
        mantenedoraId: user.mantenedoraId,
        year: createDto.year,
        segment: createDto.segment,
        version: createDto.version || 1,
      },
    });

    if (existing) {
      throw new BadRequestException(
        `Já existe uma matriz para ${createDto.segment} no ano ${createDto.year} versão ${createDto.version || 1}`,
      );
    }

    // Criar matriz
    const matrix = await this.prisma.curriculumMatrix.create({
      data: {
        ...createDto,
        mantenedoraId: user.mantenedoraId,
        createdBy: user.userId,
        updatedBy: user.userId,
      },
      include: {
        entries: true,
      },
    });

    // Auditoria
    await this.auditService.log({
      action: 'CREATE',
      entity: 'CURRICULUM_MATRIX',
      entityId: matrix.id,
      userId: user.userId,
      mantenedoraId: user.mantenedoraId,
      details: { matrixName: matrix.name, year: matrix.year, segment: matrix.segment },
    });

    return matrix;
  }

  /**
   * Listar matrizes com filtros
   */
  async findAll(query: QueryCurriculumMatrixDto, user: JwtPayload) {
    // Validar acesso
    await this.validateAccess(user);

    const where: any = {
      mantenedoraId: user.mantenedoraId,
    };

    if (query.year) {
      where.year = query.year;
    }

    if (query.segment) {
      where.segment = query.segment;
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    return this.prisma.curriculumMatrix.findMany({
      where,
      include: {
        _count: {
          select: { entries: true },
        },
      },
      orderBy: [{ year: 'desc' }, { segment: 'asc' }, { version: 'desc' }],
    });
  }

  /**
   * Buscar matriz por ID
   */
  async findOne(id: string, user: JwtPayload) {
    await this.validateAccess(user);

    const matrix = await this.prisma.curriculumMatrix.findUnique({
      where: { id },
      include: {
        entries: {
          orderBy: { date: 'asc' },
        },
        _count: {
          select: { plannings: true },
        },
      },
    });

    if (!matrix) {
      throw new NotFoundException('Matriz curricular não encontrada');
    }

    if (matrix.mantenedoraId !== user.mantenedoraId && user.roleLevel !== 'DEVELOPER') {
      throw new ForbiddenException('Acesso negado a esta matriz');
    }

    return matrix;
  }

  /**
   * Atualizar matriz
   */
  async update(id: string, updateDto: UpdateCurriculumMatrixDto, user: JwtPayload) {
    // Validar permissão
    if (
      user.roleLevel !== 'DEVELOPER' &&
      user.roleLevel !== 'MANTENEDORA' &&
      user.roleLevel !== 'STAFF_CENTRAL'
    ) {
      throw new ForbiddenException(
        'Apenas Mantenedora e Staff Central podem atualizar matrizes',
      );
    }

    const matrix = await this.findOne(id, user);

    // Verificar se há planejamentos vinculados
    const planningsCount = await this.prisma.planning.count({
      where: { curriculumMatrixId: id },
    });

    if (planningsCount > 0 && (updateDto.segment || updateDto.year)) {
      throw new BadRequestException(
        `Não é possível alterar ano ou segmento de uma matriz com ${planningsCount} planejamento(s) vinculado(s)`,
      );
    }

    const updated = await this.prisma.curriculumMatrix.update({
      where: { id },
      data: {
        ...updateDto,
        updatedBy: user.userId,
      },
      include: {
        entries: true,
      },
    });

    // Auditoria
    await this.auditService.log({
      action: 'UPDATE',
      entity: 'CURRICULUM_MATRIX',
      entityId: id,
      userId: user.userId,
      mantenedoraId: user.mantenedoraId,
      details: { before: matrix, after: updated },
    });

    return updated;
  }

  /**
   * Deletar matriz (soft delete)
   */
  async remove(id: string, user: JwtPayload) {
    // Validar permissão
    if (user.roleLevel !== 'DEVELOPER' && user.roleLevel !== 'MANTENEDORA') {
      throw new ForbiddenException('Apenas Mantenedora pode deletar matrizes');
    }

    const matrix = await this.findOne(id, user);

    // Verificar se há planejamentos vinculados
    const planningsCount = await this.prisma.planning.count({
      where: { curriculumMatrixId: id },
    });

    if (planningsCount > 0) {
      throw new BadRequestException(
        `Não é possível deletar uma matriz com ${planningsCount} planejamento(s) vinculado(s)`,
      );
    }

    await this.prisma.curriculumMatrix.update({
      where: { id },
      data: { isActive: false },
    });

    // Auditoria
    await this.auditService.log({
      action: 'DELETE',
      entity: 'CURRICULUM_MATRIX',
      entityId: id,
      userId: user.userId,
      mantenedoraId: user.mantenedoraId,
      details: { matrixName: matrix.name },
    });

    return { message: 'Matriz curricular desativada com sucesso' };
  }

  /**
   * Validar acesso do usuário
   */
  private async validateAccess(user: JwtPayload) {
    if (user.roleLevel === 'DEVELOPER') {
      return; // Developer tem acesso total
    }

    // Todos os outros níveis podem visualizar, mas apenas criar/editar é restrito
    return;
  }
}
