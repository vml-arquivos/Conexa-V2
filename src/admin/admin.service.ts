import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { MaterialCatalogCategory } from '@prisma/client';
import { Readable } from 'stream';
import csvParser from 'csv-parser';
import { parse, isValid } from 'date-fns';

type CsvRow = Record<string, any>;

function norm(v: any): string {
  return String(v ?? '').trim();
}

function stripTeacherPrefix(name: string): string {
  return name
    .replace(/\bPROFESSORA\b/gi, '')
    .replace(/\bPROFESSOR\b/gi, '')
    .replace(/\bPROFA\.?\b/gi, '')
    .replace(/\bPROF\.?\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitName(full: string): { firstName: string; lastName: string } {
  const clean = norm(full).replace(/\s+/g, ' ').trim();
  const parts = clean.split(' ').filter(Boolean);
  if (parts.length === 0) return { firstName: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

function classroomCodeFromName(name: string): string {
  const c = norm(name)
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
  return c || `TURMA_${Date.now()}`;
}

function parseBirthDateToUTC(raw: string): Date | null {
  const v = norm(raw);
  if (!v) return null;

  // dd/MM/yyyy (BR)
  const d1 = parse(v, 'dd/MM/yyyy', new Date());
  if (isValid(d1)) return new Date(Date.UTC(d1.getFullYear(), d1.getMonth(), d1.getDate()));

  // d/M/yyyy
  const d2 = parse(v, 'd/M/yyyy', new Date());
  if (isValid(d2)) return new Date(Date.UTC(d2.getFullYear(), d2.getMonth(), d2.getDate()));

  // ISO fallback
  const iso = new Date(v);
  if (!Number.isNaN(iso.getTime())) return new Date(Date.UTC(iso.getUTCFullYear(), iso.getUTCMonth(), iso.getUTCDate()));

  return null;
}

function detectSeparator(buffer: Buffer): ',' | ';' {
  const head = buffer.toString('utf8', 0, Math.min(buffer.length, 4096));
  const firstLine = head.split(/\r?\n/)[0] || '';
  const commas = (firstLine.match(/,/g) || []).length;
  const semis = (firstLine.match(/;/g) || []).length;
  return semis > commas ? ';' : ',';
}

async function parseCsv(buffer: Buffer): Promise<CsvRow[]> {
  const sep = detectSeparator(buffer);
  return new Promise((resolve, reject) => {
    const rows: CsvRow[] = [];
    Readable.from(buffer)
      .pipe(
        csvParser({
          separator: sep,
          mapHeaders: ({ header }) => (header ? header.trim() : header),
        }),
      )
      .on('data', (row: CsvRow) => rows.push(row))
      .on('end', () => resolve(rows))
      .on('error', (err: any) => reject(err));
  });
}

function mapCategory(raw: string): MaterialCatalogCategory {
  const v = norm(raw).toUpperCase();
  if (v === 'HYGIENE' || v === 'HIGIENE') return MaterialCatalogCategory.HYGIENE;
  if (v === 'PEDAGOGICAL' || v === 'PEDAGOGICO' || v === 'PEDAGÓGICO') return MaterialCatalogCategory.PEDAGOGICAL;
  if (v === 'FOOD' || v === 'ALIMENTACAO' || v === 'ALIMENTAÇÃO') return MaterialCatalogCategory.FOOD;
  return MaterialCatalogCategory.HYGIENE;
}

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  private async resolveUnitId(user: JwtPayload, unitIdParam?: string): Promise<string> {
    if (!user?.mantenedoraId) throw new BadRequestException('mantenedoraId ausente no token');

    if (unitIdParam) {
      const u = await this.prisma.unit.findFirst({
        where: { id: unitIdParam, mantenedoraId: user.mantenedoraId },
        select: { id: true },
      });
      if (!u) throw new BadRequestException('unitId inválido para esta mantenedora');
      return u.id;
    }

    if (user.unitId) return user.unitId;

    const units = await this.prisma.unit.findMany({
      where: { mantenedoraId: user.mantenedoraId },
      select: { id: true },
      take: 2,
    });

    if (units.length === 1) return units[0].id;
    throw new BadRequestException('unitId obrigatório (mantenedora possui múltiplas unidades)');
  }

  async importMaterialCatalogCsv(file: Express.Multer.File, user: JwtPayload) {
    if (!file?.buffer?.length) throw new BadRequestException('Arquivo CSV ausente');
    if (!user?.mantenedoraId) throw new BadRequestException('mantenedoraId ausente no token');

    const rows = await parseCsv(file.buffer);

    let upserted = 0;
    let skipped = 0;

    for (const r of rows) {
      const item = norm(r.item ?? r.Item ?? r.ITEM);
      const unit = norm(r.unit ?? r.Unit ?? r.UNIT);
      const categoryRaw = norm(r.category ?? r.Category ?? r.CATEGORY);

      if (!item || !unit) { skipped++; continue; }
      const category = mapCategory(categoryRaw);

      await this.prisma.materialCatalog.upsert({
        where: {
          mantenedoraId_item_category_unit: {
            mantenedoraId: user.mantenedoraId,
            item,
            category,
            unit,
          },
        },
        create: { mantenedoraId: user.mantenedoraId, item, category, unit },
        update: {},
      });

      upserted++;
    }

    return { ok: true, rows: rows.length, upserted, skipped };
  }

  // CSV REAL: ALUNO, NASCIMENTO, TURMA, PROFESSORA
  async importCepi2026Csv(file: Express.Multer.File, user: JwtPayload, unitIdParam?: string) {
    if (!file?.buffer?.length) throw new BadRequestException('Arquivo CSV ausente');
    if (!user?.mantenedoraId) throw new BadRequestException('mantenedoraId ausente no token');

    const unitId = await this.resolveUnitId(user, unitIdParam);
    const rows = await parseCsv(file.buffer);

    let classroomsUpserted = 0;
    let teacherLinks = 0;
    let childrenUpserted = 0;
    let enrollmentsUpserted = 0;

    const missingTeachers: string[] = [];
    const invalidRows: Array<{ row: number; reason: string }> = [];

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];

      const aluno = norm(r.ALUNO ?? r.Aluno ?? r.aluno);
      const nascimento = norm(r.NASCIMENTO ?? r.Nascimento ?? r.nascimento);
      const turma = norm(r.TURMA ?? r.Turma ?? r.turma);
      const professoraRaw = norm(r.PROFESSORA ?? r.Professora ?? r.professora);

      if (!aluno || !turma) {
        invalidRows.push({ row: i + 1, reason: 'ALUNO ou TURMA vazio' });
        continue;
      }

      const dob = parseBirthDateToUTC(nascimento);
      if (!dob) {
        invalidRows.push({ row: i + 1, reason: 'NASCIMENTO inválido (esperado dd/MM/yyyy)' });
        continue;
      }

      const classroomCode = classroomCodeFromName(turma);

      const classroom = await this.prisma.classroom.upsert({
        where: { unitId_code: { unitId, code: classroomCode } },
        create: {
          unitId,
          name: turma,
          code: classroomCode,
          createdBy: user.sub,
        },
        update: {
          name: turma,
          updatedBy: user.sub,
        },
        select: { id: true },
      });
      classroomsUpserted++;

      // Teacher link (se professor existir)
      const profName = stripTeacherPrefix(professoraRaw);
      if (profName) {
        const t = splitName(profName);
        if (t.firstName) {
          const teacher = await this.prisma.user.findFirst({
            where: {
              mantenedoraId: user.mantenedoraId,
              firstName: { equals: t.firstName, mode: 'insensitive' },
              lastName: { equals: t.lastName, mode: 'insensitive' },
            },
            select: { id: true },
          });

          if (teacher) {
            await this.prisma.classroomTeacher.upsert({
              where: { classroomId_teacherId: { classroomId: classroom.id, teacherId: teacher.id } },
              create: { classroomId: classroom.id, teacherId: teacher.id },
              update: { isActive: true },
            });
            teacherLinks++;
          } else {
            missingTeachers.push(profName);
          }
        }
      }

      const n = splitName(aluno);
      if (!n.firstName) {
        invalidRows.push({ row: i + 1, reason: 'ALUNO inválido' });
        continue;
      }

      const existing = await this.prisma.child.findFirst({
        where: {
          mantenedoraId: user.mantenedoraId,
          unitId,
          firstName: n.firstName,
          lastName: n.lastName,
          dateOfBirth: dob,
        },
        select: { id: true },
      });

      const childId =
        existing?.id ??
        (
          await this.prisma.child.create({
            data: {
              mantenedoraId: user.mantenedoraId,
              unitId,
              firstName: n.firstName,
              lastName: n.lastName,
              dateOfBirth: dob,
              createdBy: user.sub,
            },
            select: { id: true },
          })
        ).id;

      childrenUpserted++;

      await this.prisma.enrollment.upsert({
        where: { childId_classroomId: { childId, classroomId: classroom.id } },
        create: {
          childId,
          classroomId: classroom.id,
          enrollmentDate: new Date(),
          createdBy: user.sub,
        },
        update: {
          status: 'ATIVA' as any,
          updatedBy: user.sub,
        },
      });
      enrollmentsUpserted++;
    }

    // dedup missing teachers
    const uniqMissing = Array.from(new Set(missingTeachers)).sort();

    return {
      ok: true,
      unitId,
      rows: rows.length,
      classroomsUpserted,
      teacherLinks,
      childrenUpserted,
      enrollmentsUpserted,
      missingTeachers: uniqMissing,
      invalidRows,
    };
  }
}
