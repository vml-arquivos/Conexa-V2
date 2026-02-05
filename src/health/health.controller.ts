import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';
import { Public } from '../common/decorators/public.decorator';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  /**
   * GET /health
   * Liveness probe - verifica se o app está vivo
   * NÃO depende do banco de dados
   * Usado pelo Coolify para healthcheck
   */
  @Get()
  @Public()
  check() {
    return this.healthService.check();
  }

  /**
   * GET /health/ready
   * Readiness probe - verifica se o app está pronto para receber tráfego
   * DEPENDE do banco de dados
   * Usado para verificar se o sistema está totalmente operacional
   */
  @Get('ready')
  @Public()
  async ready() {
    return this.healthService.ready();
  }
}
