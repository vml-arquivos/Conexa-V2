import { Global, Logger, Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';
import { TenantCacheInterceptor } from './tenant-cache.interceptor';
import { MatrixCacheInvalidationService } from './matrix-cache-invalidation.service';
import { MatrixCacheInterceptor } from './matrix-cache.interceptor';

@Global()
@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: async () => {
        const logger = new Logger('RedisCache');
        const url = process.env.REDIS_URL;

        if (!url) {
          logger.warn('REDIS_URL ausente — usando cache em memória (dev/test).');
          return { ttl: 300 };
        }

        const store = await redisStore({ url });
        logger.log('Redis cache store habilitado.');
        return { store, ttl: 300 };
      },
    }),
  ],
  providers: [
    TenantCacheInterceptor,
    MatrixCacheInvalidationService,
    MatrixCacheInterceptor,
  ],
  exports: [
    TenantCacheInterceptor,
    MatrixCacheInvalidationService,
    MatrixCacheInterceptor,
  ],
})
export class RedisCacheModule {}
