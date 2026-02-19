import { Module } from '@nestjs/common';
import { PedidoCompraController } from './pedido-compra.controller';
import { PedidoCompraService } from './pedido-compra.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditService } from '../common/services/audit.service';

@Module({
  imports: [PrismaModule],
  controllers: [PedidoCompraController],
  providers: [PedidoCompraService, AuditService],
  exports: [PedidoCompraService],
})
export class PedidoCompraModule {}
