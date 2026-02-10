import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MatrixCacheInvalidationService } from '../cache/matrix-cache-invalidation.service';
import { AuditService } from '../common/services/audit.service';
import { CreateCurriculumMatrixDto } from './dto/create-curriculum-matrix.dto';
import { UpdateCurriculumMatrixDto } from './dto/update-curriculum-matrix.dto';
import { QueryCurriculumMatrixDto } from './dto/query-curriculum-matrix.dto';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@Injectable()
export class CurriculumMatrixService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  
    private readonly matrixCacheInvalidation: MatrixCacheInvalidationService,
  
) {}


  /**
   * Criar uma nova Matriz Curricular
   * Apenas Mantenedora e Staff Central podem criar
   */
  async create(createDto: CreateCurriculumMatrixDto, user: JwtPayload) {
    // Validar permissão
    if (
      user.roles[0]?.level !== 'DEVELOPER' &&
      user.roles[0]?.level !== 'MANTENEDORA' &&
      user.roles[0]?.level !== 'STAFF_CENTRAL'
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
        createdBy: user.sub,
        updatedBy: user.sub,
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
      userId: user.sub,
      mantenedoraId: user.mantenedoraId,
      changes: { matrixName: matrix.name, year: matrix.year, segment: matrix.segment },
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

    const matrix = await this.prisma.curriculumMatrix.findFirst({
      where: {
        id,
        mantenedoraId: user.roles[0]?.level === 'DEVELOPER' ? undefined : user.mantenedoraId,
      },
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

    return matrix;
  }

  /**
   * Atualizar matriz
   */
  async update(id: string, updateDto: UpdateCurriculumMatrixDto, user: JwtPayload) {
    // Validar permissão
    if (
      user.roles[0]?.level !== 'DEVELOPER' &&
      user.roles[0]?.level !== 'MANTENEDORA' &&
      user.roles[0]?.level !== 'STAFF_CENTRAL'
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
        updatedBy: user.sub,
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
      userId: user.sub,
      mantenedoraId: user.mantenedoraId,
      changes: { before: matrix, after: updated },
    });

    await this.matrixCacheInvalidation.bump(user.mantenedoraId);

    return updated;
  }

  /**
   * Deletar matriz (soft delete)
   */
  async remove(id: string, user: JwtPayload) {
    // Validar permissão
    if (user.roles[0]?.level !== 'DEVELOPER' && user.roles[0]?.level !== 'MANTENEDORA') {
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
      userId: user.sub,
      mantenedoraId: user.mantenedoraId,
      changes: { matrixName: matrix.name },
    });

    return { message: 'Matriz curricular desativada com sucesso' };
  }

  /**
   * Obter status do último import da matriz
   */
  async getImportStatus(id: string, user: JwtPayload) {
    // Verificar se matriz existe
    const matrix = await this.prisma.curriculumMatrix.findUnique({
      where: { id },
    });

    if (!matrix) {
      throw new NotFoundException('Matriz curricular não encontrada');
    }

    // Buscar último registro de import no AuditLog
    const lastImport = await this.prisma.auditLog.findFirst({
      where: {
        entity: 'CURRICULUM_MATRIX',
        action: 'IMPORT',
        entityId: id,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!lastImport) {
      throw new NotFoundException('No import found for this matrix');
    }

    // Parse changes JSON para extrair dados do import
    const changes = lastImport.changes as any;

    return {
      matrixId: id,
      lastImportAt: lastImport.createdAt.toISOString(),
      importedBy: lastImport.user ? {
        id: lastImport.user.id,
        name: `${lastImport.user.firstName} ${lastImport.user.lastName}`,
        email: lastImport.user.email,
      } : null,
      pdfHash: changes.pdfHash || null,
      result: changes.result || 'SUCCESS',
      totalEntries: changes.totalExtracted || changes.totalInserted || 0,
    };
  }

  /**
   * Validar acesso do usuário
   */
  private async validateAccess(user: JwtPayload) {
    if (user.roles[0]?.level === 'DEVELOPER') {
      return; // Developer tem acesso total
    }

    // Todos os outros níveis podem visualizar, mas apenas criar/editar é restrito
    return;
  }
}
