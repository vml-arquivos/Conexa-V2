import { Module, Logger } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';
import { TenantCacheInterceptor } from './tenant-cache.interceptor';

@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: async () => {
        const logger = new Logger('RedisCache');
        const url = process.env.REDIS_URL;

        // Em prod: definir REDIS_URL no Coolify.
        // Em dev/test: fallback em memória para não quebrar.
        if (!url) {
          logger.warn('REDIS_URL ausente — usando cache em memória (dev/test).');
          return { ttl: 300 }; // default 5 min
        }

        const store = await redisStore({ url });
        logger.log('Redis cache store habilitado.');
        return {
          store,
          ttl: 300, // default 5 min
        };
      },
    }),
  ],
  providers: [TenantCacheInterceptor],
  exports: [TenantCacheInterceptor],
})
export class RedisCacheModule {}
