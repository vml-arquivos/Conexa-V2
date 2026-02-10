import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { DailyMetricType } from '@prisma/client';
import { getPedagogicalDay } from '../common/utils/date.utils';

type DiaryCreatedEvent = { unitId: string; eventDate: string | Date };
type DashboardAccessedEvent = { unitId: string; accessDate: string | Date };

function toDayBucketUTC(d: Date): Date {
  const ymd = getPedagogicalDay(d); // YYYY-MM-DD no fuso pedagógico
  return new Date(`${ymd}T00:00:00.000Z`);
}

@Injectable()
export class MetricsListener {
  constructor(private readonly prisma: PrismaService) {}

  @OnEvent('diary.created', { async: true })
  async onDiaryCreated(payload: DiaryCreatedEvent) {
    const unitId = payload.unitId;
    if (!unitId) return;

    const day = toDayBucketUTC(new Date(payload.eventDate));

    await this.prisma.dailyMetric.upsert({
      where: { unitId_date_type: { unitId, date: day, type: DailyMetricType.DIARY } },
      create: { unitId, date: day, type: DailyMetricType.DIARY, count: 1 },
      update: { count: { increment: 1 } },
    });
  }

  @OnEvent('dashboard.accessed', { async: true })
  async onDashboardAccessed(payload: DashboardAccessedEvent) {
    const unitId = payload.unitId;
    if (!unitId) return;

    const day = toDayBucketUTC(new Date(payload.accessDate));

    await this.prisma.dailyMetric.upsert({
      where: { unitId_date_type: { unitId, date: day, type: DailyMetricType.ACCESS } },
      create: { unitId, date: day, type: DailyMetricType.ACCESS, count: 1 },
      update: { count: { increment: 1 } },
    });
  }
}
