import { Inject, Injectable, ExecutionContext, NestInterceptor, CallHandler } from '@nestjs/common';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MatrixCacheInvalidationService } from './matrix-cache-invalidation.service';

@Injectable()
export class MatrixCacheInterceptor implements NestInterceptor {
  constructor(
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly invalidation: MatrixCacheInvalidationService,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const http = context.switchToHttp();
    const req = http.getRequest();

    const user = req?.user;
    const mantenedoraId = user?.mantenedoraId ?? 'no-mant';
    const unitId = user?.unitId ?? 'no-unit';
    const rolesRaw = Array.isArray(user?.roles) ? user.roles : [];
    const roleKey = rolesRaw.map((r: any) => r?.level ?? 'unknown').sort().join(',');

    const url = req.url || '';
    const v = await this.invalidation.get(mantenedoraId);

    // chave final tenant-safe + versionada
    const cacheKey = `t:${mantenedoraId}:u:${unitId}:r:${roleKey}:mv:${v}:${url}`;

    // Tentar buscar do cache
    const cached = await this.cache.get(cacheKey);
    if (cached !== undefined && cached !== null) {
      return of(cached);
    }

    // Cache miss: executar handler e cachear resultado
    return next.handle().pipe(
      tap(async (data) => {
        await this.cache.set(cacheKey, data, 86400000); // 24h em ms
      }),
    );
  }
}
