import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MatrixCacheInvalidationService } from '../cache/matrix-cache-invalidation.service';
import { AuditService } from '../common/services/audit.service';
import { CreateCurriculumMatrixEntryDto } from './dto/create-curriculum-matrix-entry.dto';
import { UpdateCurriculumMatrixEntryDto } from './dto/update-curriculum-matrix-entry.dto';
import { QueryCurriculumMatrixEntryDto } from './dto/query-curriculum-matrix-entry.dto';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@Injectable()
export class CurriculumMatrixEntryService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  
    private readonly matrixCacheInvalidation: MatrixCacheInvalidationService,
  
) {}


  /**
   * Criar uma nova entrada na Matriz Curricular
   * Apenas Mantenedora e Staff Central podem criar
   */
  async create(createDto: CreateCurriculumMatrixEntryDto, user: JwtPayload) {
    // Validar permissão
    if (
      user.roles[0]?.level !== 'DEVELOPER' &&
      user.roles[0]?.level !== 'MANTENEDORA' &&
      user.roles[0]?.level !== 'STAFF_CENTRAL'
    ) {
      throw new ForbiddenException(
        'Apenas Mantenedora e Staff Central podem criar entradas na matriz',
      );
    }

    // Verificar se a matriz existe e pertence à mantenedora
    const matrix = await this.prisma.curriculumMatrix.findUnique({
      where: { id: createDto.matrixId },
    });

    if (!matrix) {
      throw new NotFoundException('Matriz curricular não encontrada');
    }

    if (matrix.mantenedoraId !== user.mantenedoraId && user.roles[0]?.level !== 'DEVELOPER') {
      throw new ForbiddenException('Acesso negado a esta matriz');
    }

    // Verificar se já existe uma entrada para a mesma data e campo de experiência
    const existing = await this.prisma.curriculumMatrixEntry.findFirst({
      where: {
        matrixId: createDto.matrixId,
        date: new Date(createDto.date),
        campoDeExperiencia: createDto.campoDeExperiencia,
      },
    });

    if (existing) {
      throw new BadRequestException(
        `Já existe uma entrada para ${createDto.campoDeExperiencia} na data ${createDto.date}`,
      );
    }

    // Criar entrada
    const entry = await this.prisma.curriculumMatrixEntry.create({
      data: {
        ...createDto,
        date: new Date(createDto.date),
      },
      include: {
        matrix: true,
      },
    });

    // Auditoria
    await this.auditService.log({
      action: 'CREATE',
      entity: 'CURRICULUM_MATRIX_ENTRY',
      entityId: entry.id,
      userId: user.sub,
      mantenedoraId: user.mantenedoraId,
      changes: {
        matrixId: entry.matrixId,
        date: entry.date,
        campoDeExperiencia: entry.campoDeExperiencia,
      },
    });

    await this.matrixCacheInvalidation.bump(user.mantenedoraId);

    return entry;
  }

  /**
   * Listar entradas com filtros
   */
  async findAll(query: QueryCurriculumMatrixEntryDto, user: JwtPayload) {
    // Validar acesso
    await this.validateAccess(user);

    const where: any = {};

    if (query.matrixId) {
      // Verificar se a matriz pertence à mantenedora
      const matrix = await this.prisma.curriculumMatrix.findUnique({
        where: { id: query.matrixId },
      });

      if (!matrix) {
        throw new NotFoundException('Matriz curricular não encontrada');
      }

      if (matrix.mantenedoraId !== user.mantenedoraId && user.roles[0]?.level !== 'DEVELOPER') {
        throw new ForbiddenException('Acesso negado a esta matriz');
      }

      where.matrixId = query.matrixId;
    } else {
      // Filtrar por mantenedora se não especificar matriz
      where.matrix = {
        mantenedoraId: user.mantenedoraId,
      };
    }

    if (query.startDate || query.endDate) {
      where.date = {};
      if (query.startDate) {
        where.date.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.date.lte = new Date(query.endDate);
      }
    }

    if (query.weekOfYear) {
      where.weekOfYear = query.weekOfYear;
    }

    if (query.dayOfWeek) {
      where.dayOfWeek = query.dayOfWeek;
    }

    if (query.campoDeExperiencia) {
      where.campoDeExperiencia = query.campoDeExperiencia;
    }

    return this.prisma.curriculumMatrixEntry.findMany({
      where,
      include: {
        matrix: {
          select: {
            id: true,
            name: true,
            year: true,
            segment: true,
          },
        },
        _count: {
          select: { diaryEvents: true },
        },
      },
      orderBy: [{ date: 'asc' }, { campoDeExperiencia: 'asc' }],
    });
  }

  /**
   * Buscar entrada por ID
   */
  async findOne(id: string, user: JwtPayload) {
    await this.validateAccess(user);

    const entry = await this.prisma.curriculumMatrixEntry.findFirst({
      where: {
        id,
        matrix: {
          mantenedoraId: user.roles[0]?.level === 'DEVELOPER' ? undefined : user.mantenedoraId,
        },
      },
      include: {
        matrix: true,
        diaryEvents: {
          select: {
            id: true,
            title: true,
            eventDate: true,
            child: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (!entry) {
      throw new NotFoundException('Entrada da matriz não encontrada');
    }

    return entry;
  }

  /**
   * Atualizar entrada (apenas campos editáveis)
   */
  async update(id: string, updateDto: UpdateCurriculumMatrixEntryDto, user: JwtPayload) {
    // Validar permissão
    if (
      user.roles[0]?.level !== 'DEVELOPER' &&
      user.roles[0]?.level !== 'MANTENEDORA' &&
      user.roles[0]?.level !== 'STAFF_CENTRAL'
    ) {
      throw new ForbiddenException(
        'Apenas Mantenedora e Staff Central podem atualizar entradas',
      );
    }

    const entry = await this.findOne(id, user);

    // Verificar se há eventos vinculados
    const eventsCount = await this.prisma.diaryEvent.count({
      where: { curriculumEntryId: id },
    });

    if (eventsCount > 0) {
      // Permitir apenas atualização de campos não-normativos
      if (Object.keys(updateDto).some(key => !['intencionalidade', 'exemploAtividade', 'weekOfYear', 'dayOfWeek', 'bimester', 'objetivoBNCCCode'].includes(key))) {
        throw new BadRequestException(
          `Esta entrada possui ${eventsCount} evento(s) vinculado(s). Apenas campos de sugestão podem ser editados.`,
        );
      }
    }

    const updated = await this.prisma.curriculumMatrixEntry.update({
      where: { id },
      data: updateDto,
      include: {
        matrix: true,
      },
    });

    // Auditoria
    await this.auditService.log({
      action: 'UPDATE',
      entity: 'CURRICULUM_MATRIX_ENTRY',
      entityId: id,
      userId: user.sub,
      mantenedoraId: user.mantenedoraId,
      changes: { before: entry, after: updated },
    });

    await this.matrixCacheInvalidation.bump(user.mantenedoraId);

    return updated;
  }

  /**
   * Deletar entrada
   */
  async remove(id: string, user: JwtPayload) {
    // Validar permissão
    if (user.roles[0]?.level !== 'DEVELOPER' && user.roles[0]?.level !== 'MANTENEDORA') {
      throw new ForbiddenException('Apenas Mantenedora pode deletar entradas');
    }

    const entry = await this.findOne(id, user);

    // Verificar se há eventos vinculados
    const eventsCount = await this.prisma.diaryEvent.count({
      where: { curriculumEntryId: id },
    });

    if (eventsCount > 0) {
      throw new BadRequestException(
        `Não é possível deletar uma entrada com ${eventsCount} evento(s) vinculado(s)`,
      );
    }

    await this.prisma.curriculumMatrixEntry.delete({
      where: { id },
    });

    // Auditoria
    await this.auditService.log({
      action: 'DELETE',
      entity: 'CURRICULUM_MATRIX_ENTRY',
      entityId: id,
      userId: user.sub,
      mantenedoraId: user.mantenedoraId,
      changes: { entry },
    });

    await this.matrixCacheInvalidation.bump(user.mantenedoraId);

    return { message: 'Entrada da matriz deletada com sucesso' };
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
