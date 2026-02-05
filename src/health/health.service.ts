import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HealthService {
  constructor(private prisma: PrismaService) {}

  /**
   * Health check - NÃO depende do banco de dados
   * Usado pelo Coolify para verificar se o container está vivo
   * Retorna sempre 200 OK se o app está rodando
   */
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  /**
   * Readiness check - DEPENDE do banco de dados
   * Usado para verificar se o app está pronto para receber tráfego
   * Retorna 503 se o banco estiver inacessível
   */
  async ready() {
    const timestamp = new Date().toISOString();

    try {
      // Test database connection with simple query
      await this.prisma.$queryRaw`SELECT 1`;

      return {
        status: 'ready',
        database: 'up',
        timestamp,
      };
    } catch (error) {
      throw new ServiceUnavailableException({
        status: 'not_ready',
        database: 'down',
        error: error.message,
        timestamp,
      });
    }
  }
}
