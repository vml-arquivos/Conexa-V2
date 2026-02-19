import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MatrixCacheInvalidationService } from '../cache/matrix-cache-invalidation.service';
import { AuditService } from '../common/services/audit.service';
import { CurriculumPdfParserService, ParsedMatrixEntry } from './curriculum-pdf-parser.service';
import { ImportCurriculumDto, ImportMatrixDto, ImportMode } from './dto/import-curriculum.dto';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { RoleLevel, AuditLogAction, AuditLogEntity } from '@prisma/client';
import { getPedagogicalDay } from '../common/utils/date.utils';

/**
 * Resultado da importação
 */
export interface ImportResult {
  mode: ImportMode;
  matrixId?: string;
  totalExtracted: number;
  totalInserted: number;
  totalUpdated: number;
  totalUnchanged: number;
  preview?: any[];
  errors: string[];
}

@Injectable()
export class CurriculumImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly pdfParser: CurriculumPdfParserService,
  
    private readonly matrixCacheInvalidation: MatrixCacheInvalidationService,
  
) {}


  /**
   * Importação em modo dry-run (simulação)
   */
  async importDryRun(dto: ImportCurriculumDto, user: JwtPayload): Promise<ImportResult> {
    // Validar permissão
    this.validatePermission(user);

    // Parse do PDF
    const parserResult = await this.pdfParser.parsePdf(dto.sourceUrl);

    // Simular upsert
    const result = await this.simulateUpsert(
      dto.mantenedoraId,
      dto.year,
      dto.segment,
      dto.version,
      parserResult.entries,
    );

    return {
      mode: ImportMode.DRY_RUN,
      totalExtracted: parserResult.totalExtracted,
      totalInserted: result.inserts,
      totalUpdated: result.updates,
      totalUnchanged: result.unchanged,
      preview: result.preview,
      errors: parserResult.errors,
    };
  }

  /**
   * Importação real (apply)
   */
  async importApply(matrixId: string, dto: ImportMatrixDto, user: JwtPayload): Promise<ImportResult> {
    // Validar permissão
    this.validatePermission(user);

    // Buscar matriz
    const matrix = await this.prisma.curriculumMatrix.findUnique({
      where: { id: matrixId },
    });

    if (!matrix) {
      throw new NotFoundException('Matriz curricular não encontrada');
    }

    // Validar escopo
    if (matrix.mantenedoraId !== user.mantenedoraId && user.roles.every(r => r.level !== RoleLevel.DEVELOPER)) {
      throw new ForbiddenException('Você não tem permissão para importar esta matriz');
    }

    // Parse do PDF
    const parserResult = await this.pdfParser.parsePdf(dto.sourceUrl);

    // Aplicar upsert
    const result = await this.applyUpsert(
      matrix,
      parserResult.entries,
      dto.force || false,
      user,
    );

    // Registrar auditoria
    await this.auditService.log({
      action: AuditLogAction.IMPORT,
      entity: AuditLogEntity.CURRICULUM_MATRIX,
      entityId: matrixId,
      userId: user.sub,
      mantenedoraId: matrix.mantenedoraId,
      unitId: undefined,
      changes: {
        totalExtracted: parserResult.totalExtracted,
        totalInserted: result.inserts,
        totalUpdated: result.updates,
        totalUnchanged: result.unchanged,
        sourceUrl: dto.sourceUrl,
        force: dto.force,
      },
    });

    await this.matrixCacheInvalidation.bump(matrix.mantenedoraId);

    return {
      mode: ImportMode.APPLY,
      matrixId,
      totalExtracted: parserResult.totalExtracted,
      totalInserted: result.inserts,
      totalUpdated: result.updates,
      totalUnchanged: result.unchanged,
      errors: parserResult.errors,
    };
  }

  /**
   * Simula upsert para dry-run
   */
  private async simulateUpsert(
    mantenedoraId: string,
    year: number,
    segment: string,
    version: number,
    entries: ParsedMatrixEntry[],
  ): Promise<{ inserts: number; updates: number; unchanged: number; preview: any[] }> {
    // Buscar ou simular matriz
    const existingMatrix = await this.prisma.curriculumMatrix.findFirst({
      where: {
        mantenedoraId,
        year,
        segment,
        version,
      },
    });

    let inserts = 0;
    let updates = 0;
    let unchanged = 0;
    const preview: any[] = [];

    for (const entry of entries.slice(0, 5)) {
      const pedagogicalDay = getPedagogicalDay(entry.date);

      if (existingMatrix) {
        const existing = await this.prisma.curriculumMatrixEntry.findFirst({
          where: {
            matrixId: existingMatrix.id,
            date: entry.date,
          },
        });

        if (existing) {
          // Verificar se há mudanças
          if (this.hasChanges(existing, entry)) {
            updates++;
            preview.push({ action: 'UPDATE', date: pedagogicalDay, entry });
          } else {
            unchanged++;
          }
        } else {
          inserts++;
          preview.push({ action: 'INSERT', date: pedagogicalDay, entry });
        }
      } else {
        inserts++;
        preview.push({ action: 'INSERT', date: pedagogicalDay, entry });
      }
    }

    // Contar o restante sem preview
    for (const entry of entries.slice(5)) {
      if (existingMatrix) {
        const existing = await this.prisma.curriculumMatrixEntry.findFirst({
          where: {
            matrixId: existingMatrix.id,
            date: entry.date,
          },
        });

        if (existing) {
          if (this.hasChanges(existing, entry)) {
            updates++;
          } else {
            unchanged++;
          }
        } else {
          inserts++;
        }
      } else {
        inserts++;
      }
    }

    return { inserts, updates, unchanged, preview };
  }

  /**
   * Aplica upsert real
   */
  private async applyUpsert(
    matrix: any,
    entries: ParsedMatrixEntry[],
    force: boolean,
    user: JwtPayload,
  ): Promise<{ inserts: number; updates: number; unchanged: number }> {
    let inserts = 0;
    let updates = 0;
    let unchanged = 0;

    for (const entry of entries) {
      try {
        // Verificar se já existe
        const existing = await this.prisma.curriculumMatrixEntry.findUnique({
          where: {
            matrixId_date: {
              matrixId: matrix.id,
              date: entry.date,
            },
          },
        });

        if (existing) {
          // Já existe: verificar se há mudanças
          const hasChanges = this.hasChanges(existing, entry);
          
          if (!hasChanges) {
            // Sem mudanças: não fazer nada
            unchanged++;
            continue;
          }

          // Com mudanças: atualizar apenas se force=true ou campos não-normativos
          if (force) {
            // Force: atualiza tudo
            await this.prisma.curriculumMatrixEntry.update({
              where: {
                matrixId_date: {
                  matrixId: matrix.id,
                  date: entry.date,
                },
              },
              data: {
                weekOfYear: entry.weekOfYear,
                dayOfWeek: entry.dayOfWeek,
                bimester: entry.bimester,
                campoDeExperiencia: entry.campoDeExperiencia,
                objetivoBNCC: entry.objetivoBNCC,
                objetivoBNCCCode: entry.objetivoBNCCCode,
                objetivoCurriculo: entry.objetivoCurriculo,
                intencionalidade: entry.intencionalidade,
                exemploAtividade: entry.exemploAtividade,
              },
            });
            updates++;
          } else {
            // Sem force: atualiza apenas campos não-normativos se mudaram
            const nonNormativeChanged = 
              existing.intencionalidade !== entry.intencionalidade ||
              existing.exemploAtividade !== entry.exemploAtividade;
            
            if (nonNormativeChanged) {
              await this.prisma.curriculumMatrixEntry.update({
                where: {
                  matrixId_date: {
                    matrixId: matrix.id,
                    date: entry.date,
                  },
                },
                data: {
                  intencionalidade: entry.intencionalidade,
                  exemploAtividade: entry.exemploAtividade,
                },
              });
              updates++;
            } else {
              unchanged++;
            }
          }
        } else {
          // Não existe: inserir
          await this.prisma.curriculumMatrixEntry.create({
            data: {
              matrixId: matrix.id,
              date: entry.date,
              weekOfYear: entry.weekOfYear,
              dayOfWeek: entry.dayOfWeek,
              bimester: entry.bimester,
              campoDeExperiencia: entry.campoDeExperiencia,
              objetivoBNCC: entry.objetivoBNCC,
              objetivoBNCCCode: entry.objetivoBNCCCode,
              objetivoCurriculo: entry.objetivoCurriculo,
              intencionalidade: entry.intencionalidade,
              exemploAtividade: entry.exemploAtividade,
            },
          });
          inserts++;
        }
      } catch (error) {
        // Ignorar erros de unique constraint (já existe)
        unchanged++;
      }
    }

    return { inserts, updates, unchanged };
  }

  /**
   * Verifica se há mudanças entre entrada existente e nova
   */
  private hasChanges(existing: any, entry: ParsedMatrixEntry): boolean {
    const normalize = (str: string | null | undefined): string => {
      if (!str) return '';
      return str.trim().replace(/\s+/g, ' ');
    };

    return (
      normalize(existing.objetivoBNCC) !== normalize(entry.objetivoBNCC) ||
      normalize(existing.objetivoCurriculo) !== normalize(entry.objetivoCurriculo) ||
      normalize(existing.intencionalidade) !== normalize(entry.intencionalidade) ||
      normalize(existing.exemploAtividade) !== normalize(entry.exemploAtividade)
    );
  }

  /**
   * Valida permissão de importação
   */
  private validatePermission(user: JwtPayload): void {
    const hasPermission = user.roles.some(
      (role) =>
        role.level === RoleLevel.DEVELOPER ||
        role.level === RoleLevel.MANTENEDORA ||
        role.level === RoleLevel.STAFF_CENTRAL,
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        'Apenas Mantenedora e Staff Central podem importar matrizes curriculares',
      );
    }
  }
}
