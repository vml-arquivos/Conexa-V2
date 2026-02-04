import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    const maxAttempts = Number(process.env.PRISMA_CONNECT_MAX_ATTEMPTS ?? 10);
    const baseDelayMs = Number(process.env.PRISMA_CONNECT_BASE_DELAY_MS ?? 500);

    let lastErr: unknown;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await this.$connect();
        this.logger.log(`Prisma connected (attempt ${attempt}/${maxAttempts}).`);
        return;
      } catch (err) {
        lastErr = err;
        const delay = Math.min(baseDelayMs * 2 ** (attempt - 1), 10_000);
        this.logger.error(
          `Prisma connection failed (attempt ${attempt}/${maxAttempts}). Retrying in ${delay}ms...`,
          (err as any)?.stack ?? String(err),
        );
        await new Promise((r) => setTimeout(r, delay));
      }
    }

    throw lastErr;
  }
}
