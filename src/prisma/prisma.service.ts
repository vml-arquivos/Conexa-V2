import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(private readonly eventEmitter: EventEmitter2) {
    super();

    this.$use(async (params, next) => {
      const result = await next(params);

      if (params.model === 'DiaryEvent' && params.action === 'create') {
        try {
          const r = result as any;
          if (r?.unitId && r?.eventDate) {
            this.eventEmitter.emit('diary.created', { unitId: r.unitId, eventDate: r.eventDate });
          }
        } catch {}
      }

      return result;
    });
  }

  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit(): Promise<void> {
    const maxAttempts = Number(process.env.PRISMA_CONNECT_MAX_ATTEMPTS ?? 10);
    const baseDelayMs = Number(process.env.PRISMA_CONNECT_BASE_DELAY_MS ?? 500);
    const maxDelayMs = Number(process.env.PRISMA_CONNECT_MAX_DELAY_MS ?? 10_000);

    let lastErr: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await this.$connect();
        this.logger.log(`Prisma connected (attempt ${attempt}/${maxAttempts}).`);
        return;
      } catch (err) {
        lastErr = err;

        const delay = Math.min(baseDelayMs * 2 ** (attempt - 1), maxDelayMs);

        this.logger.error(
          `Prisma connection failed (attempt ${attempt}/${maxAttempts}). Retrying in ${delay}ms...`,
          (err as any)?.stack ?? String(err),
        );

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    // esgotou tentativas -> falha a inicialização do Nest (correto)
    throw lastErr;
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
