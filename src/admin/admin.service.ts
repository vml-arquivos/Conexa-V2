import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { EnrollmentStatus, RoleLevel } from '@prisma/client';
import { Readable } from 'stream';
import csvParser from 'csv-parser';

function norm(v: unknown): string {
  return String(v ?? '').trim();
}

function splitName(full: string): { firstName: string; lastName: string } {
  const parts = full.split(/\s+/).filter(Boolean);
  const firstName = parts[0] ?? '';
  const lastName = parts.slice(1).join(' ') || '.';
  return { firstName, lastName };
}

/**
 * dd/mm/yyyy ou ISO -> Date UTC (00:00Z).
 * inválido -> null (não corromper com "hoje").
 */
function parseBirthDate(raw: string): Date | null {
  const s = norm(raw);
  if (!s) return null;

  const iso = new Date(s);
  if (!Number.isNaN(iso.getTime())) {
    return new Date(Date.UTC(iso.getUTCFullYear(), iso.getUTCMonth(), iso.getUTCDate()));
  }

  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const day = Number(m[1]);
  const mon = Number(m[2]);
  const year = Number(m[3]);
  if (!day || !mon || !year) return null;
  return new Date(Date.UTC(year, mon - 1, day));
}

function classroomCodeFromName(name: string): string {
  const ascii = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
  return (
    ascii
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 50) || 'TURMA'
  );
}

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);
  constructor(private readonly prisma: PrismaService) {}

  private isDeveloper(user: JwtPayload): boolean {
    return Array.isArray(user?.roles) && user.roles.some((r) => r.level === RoleLevel.DEVELOPER);
  }

  private async assertUnitAccess(user: JwtPayload, unitId: string): Promise<void> {
    if (!user?.mantenedoraId) throw new BadRequestException('mantenedoraId ausente no token');
    if (this.isDeveloper(user)) return;

    // MANTENEDORA: qualquer unidade da mesma mantenedora
    const isMantenedora = user.roles.some((r) => r.level === RoleLevel.MANTENEDORA);
    if (isMantenedora) {
      const unit = await this.prisma.unit.findUnique({
        where: { id: unitId },
        select: { mantenedoraId: true },
      });
      if (!unit || unit.mantenedoraId !== user.mantenedoraId) {
        throw new ForbiddenException('Sem acesso à unidade informada');
      }
      return;
    }

    // UNIDADE: somente sua própria unitId
    const isUnidade = user.roles.some((r) => r.level === RoleLevel.UNIDADE);
    if (isUnidade) {
      if (user.unitId !== unitId) throw new ForbiddenException('Sem acesso à unidade informada');
      return;
    }

    throw new ForbiddenException('Perfil sem permissão para importação');
  }

  async importStructureCsv(file: Express.Multer.File, user: JwtPayload, unitIdFromQuery?: string) {
    if (!file?.buffer?.length) throw new BadRequestException('Arquivo vazio');

    const unitId = norm(unitIdFromQuery) || norm(user.unitId);
    if (!unitId) {
      throw new BadRequestException('unitId obrigatório (use ?unitId=... para perfil MANTENEDORA)');
    }

    await this.assertUnitAccess(user, unitId);

    const rows: any[] = [];
    await new Promise<void>((resolve, reject) => {
      Readable.from(file.buffer)
        .pipe(csvParser())
        .on('data', (row) => rows.push(row))
        .on('end', () => resolve())
        .on('error', (err) => reject(err));
    });

    const stats = {
      rows: rows.length,
      classroomsUpserted: 0,
      childrenCreated: 0,
      enrollmentsUpserted: 0,
      skipped: 0,
      skippedReasons: { missingNameOrClass: 0, invalidBirthDate: 0 },
    };

    for (const row of rows) {
      const fullName = norm(row['ALUNO'] ?? row['Aluno'] ?? row['aluno']);
      const turmaName = norm(row['TURMA'] ?? row['Turma'] ?? row['turma']);
      const rawBirth = norm(row['NASCIMENTO'] ?? row['Nascimento'] ?? row['nascimento']);

      if (!fullName || !turmaName) {
        stats.skipped++;
        stats.skippedReasons.missingNameOrClass++;
        continue;
      }

      const birthDate = parseBirthDate(rawBirth);
      if (!birthDate) {
        stats.skipped++;
        stats.skippedReasons.invalidBirthDate++;
        continue;
      }

      const { firstName, lastName } = splitName(fullName);
      const classroomCode = classroomCodeFromName(turmaName);

      await this.prisma.$transaction(async (tx) => {
        const classroom = await tx.classroom.upsert({
          where: { unitId_code: { unitId, code: classroomCode } },
          update: { name: turmaName, updatedBy: user.sub },
          create: { unitId, name: turmaName, code: classroomCode, createdBy: user.sub },
          select: { id: true },
        });
        stats.classroomsUpserted++;

        const existing = await tx.child.findFirst({
          where: {
            mantenedoraId: user.mantenedoraId,
            unitId,
            firstName: { equals: firstName, mode: 'insensitive' },
            lastName: { equals: lastName, mode: 'insensitive' },
            dateOfBirth: birthDate,
          },
          select: { id: true },
        });

        const childId =
          existing?.id ??
          (
            await tx.child.create({
              data: {
                mantenedoraId: user.mantenedoraId,
                unitId,
                firstName,
                lastName,
                dateOfBirth: birthDate,
                createdBy: user.sub,
              },
              select: { id: true },
            })
          ).id;

        if (!existing) stats.childrenCreated++;

        await tx.enrollment.upsert({
          where: { childId_classroomId: { childId, classroomId: classroom.id } },
          update: { status: EnrollmentStatus.ATIVA, withdrawalDate: null, updatedBy: user.sub },
          create: {
            childId,
            classroomId: classroom.id,
            enrollmentDate: new Date(),
            status: EnrollmentStatus.ATIVA,
            createdBy: user.sub,
          },
        });
        stats.enrollmentsUpserted++;
      });
    }

    this.logger.log(`Import CEPI concluído: ${JSON.stringify(stats)}`);
    return { ok: true, unitId, stats };
  }
}
