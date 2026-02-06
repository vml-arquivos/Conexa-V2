import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

function parseOrigins(value?: string): (string | RegExp)[] | boolean {
  // CORS_ORIGIN pode ser:
  // - "*"  -> libera tudo (não recomendado em produção)
  // - lista: "https://a.com,https://b.com"
  // - regex: "/^https:\\/\\/.*\\.casadf\\.com\\.br$/"
  if (!value) return true;

  const v = value.trim();
  if (v === '*') return true;

  // regex no formato /.../
  if (v.startsWith('/') && v.endsWith('/')) {
    const pattern = v.slice(1, -1);
    return [new RegExp(pattern)];
  }

  return v
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // em produção pode manter logs padrão; ajuste se quiser
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });

  // Se estiver atrás de proxy (Traefik/Coolify), isso ajuda a ler IP/https corretamente
  // (não faz mal em ambiente container)
  app.set('trust proxy', 1);

  // Validação global (mantém exatamente a sua intenção)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      // sugestões “prod-friendly”:
      transformOptions: { enableImplicitConversion: true },
      stopAtFirstError: true,
    }),
  );

  // CORS configurável
  const corsOrigins = parseOrigins(process.env.CORS_ORIGIN);
  app.enableCors({
    origin: corsOrigins,
    credentials: process.env.CORS_CREDENTIALS === 'true',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: process.env.CORS_ALLOWED_HEADERS ?? 'Content-Type, Authorization',
  });

  // Prefixo global opcional (ex.: /api)
  // Se você não quiser prefixo, não setar API_PREFIX.
  const apiPrefix = process.env.API_PREFIX?.trim();
  if (apiPrefix) app.setGlobalPrefix(apiPrefix.replace(/^\/+/, ''));

  // Encerramento gracioso
  app.enableShutdownHooks();

  const port = Number(process.env.PORT ?? 3000);
  const host = process.env.HOST ?? '0.0.0.0';

  await app.listen(port, host);
  console.log(`🚀 Conexa API rodando em http://${host}:${port}${apiPrefix ? `/${apiPrefix}` : ''}`);
}

bootstrap().catch((err) => {
  // garante log se algo falhar no bootstrap
  // eslint-disable-next-line no-console
  console.error('❌ Falha ao iniciar a aplicação:', err);
  process.exit(1);
});
