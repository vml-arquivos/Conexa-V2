import {
  Injectable,
  ExecutionContext,
} from '@nestjs/common';
import { CacheInterceptor } from '@nestjs/cache-manager';

@Injectable()
export class TenantCacheInterceptor extends CacheInterceptor {
  trackBy(context: ExecutionContext): string | undefined {
    const http = context.switchToHttp();
    const req = http.getRequest();

    if (req?.__cacheKey) return req.__cacheKey;


    // CacheInterceptor base gera key pela URL (path + query)
    const baseKey = super.trackBy(context);
    if (!baseKey) return baseKey;

    const user = req?.user;
    const mantenedoraId = user?.mantenedoraId ?? 'no-mant';
    const unitId = user?.unitId ?? 'no-unit';

    const rolesRaw = Array.isArray(user?.roles) ? user.roles : [];
    const roleKey = rolesRaw
      .map((r: any) => r?.level ?? 'unknown')
      .sort()
      .join(',');

    // Evita vazamento entre tenants/escopos
    return `t:\${mantenedoraId}:u:\${unitId}:r:\${roleKey}:\${baseKey}`;
  }
}
