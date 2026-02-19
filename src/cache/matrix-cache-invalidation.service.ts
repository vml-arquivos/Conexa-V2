import { Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';

@Injectable()
export class MatrixCacheInvalidationService {
  constructor(@Inject(CACHE_MANAGER) private readonly cache: Cache) {}

  private key(mantenedoraId: string) {
    return `cachever:matrix:${mantenedoraId}`;
  }

  async bump(mantenedoraId: string): Promise<number> {
    const k = this.key(mantenedoraId);
    const current = (await this.cache.get<number>(k)) ?? 0;
    const next = current + 1;

    // pedido do briefing: usar del para "forçar" atualização
    await this.cache.del(k);
    await this.cache.set(k, next, 0);

    return next;
  }

  async get(mantenedoraId: string): Promise<number> {
    return (await this.cache.get<number>(this.key(mantenedoraId))) ?? 0;
  }
}
