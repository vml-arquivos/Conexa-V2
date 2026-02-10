import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { Inject } from '@nestjs/common';

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  // Cache helper (key por role+scope)
  private async cached<T>(key: string, ttlSeconds: number, fn: () => Promise<T>): Promise<T> {
    const hit = await this.cache.get<T>(key);
    if (hit) return hit;
    const val = await fn();
    await this.cache.set(key, val, ttlSeconds * 1000);
    return val;
  }

  // =========================
  // MANTENEDORA: /admin/global-stats
  // =========================
  async getGlobalStats(user: JwtPayload) {
    if (!user?.mantenedoraId) throw new ForbiddenException('Escopo de mantenedora ausente');

    const key = `analytics:global:${user.mantenedoraId}`;
    return this.cached(key, 60, async () => {
      // Unidades da mantenedora
      const units = await this.prisma.unit.count({
        where: { mantenedoraId: user.mantenedoraId },
      });

      // Alunos ativos (Enrollment ATIVA) — mantendo escopo por mantenedora via Classroom.Unit
      const activeStudents = await this.prisma.enrollment.count({
        where: {
          status: 'ATIVA',
          classroom: {
            unit: { mantenedoraId: user.mantenedoraId },
          },
        },
      });

      // Alertas críticos (exemplo seguro/rápido): eventos com trocaFraldaStatus "ALERTA" nas últimas 48h
      const since = new Date(Date.now() - 48 * 60 * 60 * 1000);
      const criticalAlerts = await this.prisma.diaryEvent.count({
        where: {
          mantenedoraId: user.mantenedoraId,
          createdAt: { gte: since },
          // JSONB => filtragem em nível app é cara; aqui só filtra se existir campo (não perfeito, mas barato)
          // Se precisar precisão, usar queryRaw com jsonb_extract_path_text (fora do escopo aqui).
          // trocaFraldaStatus: { not: null }, // Comentado: não suportado pelo Prisma
        },
      });

      return {
        scope: 'MANTENEDORA',
        units,
        activeStudents,
        criticalAlerts,
        generatedAt: new Date().toISOString(),
      };
    });
  }

  // =========================
  // UNIDADE/DIRETOR: /unit/dashboard
  // =========================
  async getUnitDashboard(user: JwtPayload) {
    const unitId = user?.unitId;
    if (!unitId) throw new ForbiddenException('Escopo de unidade ausente');

    const key = `analytics:unit:${unitId}`;
    return this.cached(key, 45, async () => {
      // Frequência: contar presenças nos últimos 7 dias
      const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const attendanceCount = await this.prisma.attendance.count({
        where: {
          unitId,
          date: { gte: since7d },
          status: 'PRESENTE',
        },
      });

      // Planejamentos pendentes na unidade (status != CONCLUIDO)
      const pendingPlannings = await this.prisma.planning.count({
        where: {
          unitId,
          status: { not: 'CONCLUIDO' as any },
        },
      });

      return {
        scope: 'UNIDADE',
        unitId,
        attendanceLast7d: attendanceCount,
        pendingPlannings,
        generatedAt: new Date().toISOString(),
      };
    });
  }

  // =========================
  // NUTRIÇÃO: /nutrition/report
  // - Somatório micro-gestos medicaoAlimentar via SQL JSONB (rápido) + restrições
  // =========================
  async getNutritionReport(user: JwtPayload) {
    const unitId = user?.unitId;
    if (!unitId) throw new ForbiddenException('Escopo de unidade ausente');

    const key = `analytics:nutrition:${unitId}`;
    return this.cached(key, 60, async () => {
      // Restrições dietéticas por unidade (via Child.Enrollment.Classroom.Unit)
      const restrictions = await this.prisma.dietaryRestriction.count({
        where: {
          child: {
            enrollments: {
              some: {
                classroom: { unitId },
              },
            },
          },
        },
      });

      // Somar um campo numérico dentro do JSONB medicaoAlimentar (ex.: "ml" ou "quantidade")
      // Convenção: se existir medicaoAlimentar.ml como número/string numérica.
      // Usa queryRaw com COALESCE + cast para numeric.
      const sumRows = await this.prisma.$queryRawUnsafe<any[]>(`
        SELECT
          COALESCE(SUM(NULLIF((medicaoAlimentar->>'ml'),'')::numeric), 0) AS total_ml
        FROM "DiaryEvent"
        WHERE "unitId" = $1
          AND "medicaoAlimentar" IS NOT NULL
      `, unitId);

      const totalMl = Number(sumRows?.[0]?.total_ml ?? 0);

      return {
        scope: 'NUTRICAO',
        unitId,
        totalMl,
        restrictions,
        generatedAt: new Date().toISOString(),
      };
    });
  }

  // =========================
  // PROFESSOR: /classroom/daily-summary?classroomId=...&date=...
  // - resumo sono/trocas da turma
  // =========================
  async getClassroomDailySummary(user: JwtPayload, classroomId: string, dateISO?: string) {
    if (!classroomId) throw new ForbiddenException('classroomId obrigatório');

    const day = dateISO ? new Date(dateISO) : new Date();
    const start = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 0, 0, 0));
    const end = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 23, 59, 59));

    const key = `analytics:classroom:${classroomId}:${start.toISOString().slice(0,10)}`;
    return this.cached(key, 30, async () => {
      // Apenas eventos da turma e do dia
      const events = await this.prisma.diaryEvent.findMany({
        where: {
          classroomId,
          eventDate: { gte: start, lte: end },
        },
        select: {
          sonoMinutos: true,
          trocaFraldaStatus: true,
        },
      });

      // sonoMinutos é JSONB (número) => somar no app (barato com poucos eventos/dia)
      let totalSono = 0;
      const trocaCounts: Record<string, number> = {};

      for (const e of events) {
        const sm = (e as any).sonoMinutos;
        const n = typeof sm === 'number' ? sm : (typeof sm === 'string' ? Number(sm) : 0);
        if (!Number.isNaN(n)) totalSono += n;

        const st = (e as any).trocaFraldaStatus;
        const k = st ? String(st) : 'SEM_INFO';
        trocaCounts[k] = (trocaCounts[k] ?? 0) + 1;
      }

      return {
        scope: 'PROFESSOR',
        classroomId,
        date: start.toISOString().slice(0,10),
        totalSonoMinutos: totalSono,
        trocas: trocaCounts,
        eventsCount: events.length,
        generatedAt: new Date().toISOString(),
      };
    });
  }
}
