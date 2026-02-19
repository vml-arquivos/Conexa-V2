import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { RequireRoles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { PedidoCompraService } from './pedido-compra.service';
import { ConsolidarPedidoDto } from './dto/consolidar-pedido.dto';
import { AtualizarStatusPedidoDto } from './dto/atualizar-status-pedido.dto';
import { RoleLevel, StatusPedidoCompra } from '@prisma/client';

@Controller('pedidos-compra')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PedidoCompraController {
  constructor(private readonly svc: PedidoCompraService) {}

  /**
   * POST /pedidos-compra/consolidar
   * Consolida requisições aprovadas do mês em um Pedido de Compra.
   * RBAC: UNIDADE, MANTENEDORA, DEVELOPER
   */
  @Post('consolidar')
  @RequireRoles(RoleLevel.UNIDADE, RoleLevel.MANTENEDORA, RoleLevel.DEVELOPER)
  consolidar(
    @Body() dto: ConsolidarPedidoDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.svc.consolidar(dto, user);
  }

  /**
   * GET /pedidos-compra
   * Lista pedidos com filtros opcionais.
   * RBAC: UNIDADE (própria), STAFF_CENTRAL (leitura), MANTENEDORA, DEVELOPER
   */
  @Get()
  @RequireRoles(
    RoleLevel.UNIDADE,
    RoleLevel.STAFF_CENTRAL,
    RoleLevel.MANTENEDORA,
    RoleLevel.DEVELOPER,
  )
  listar(
    @CurrentUser() user: JwtPayload,
    @Query('mesReferencia') mesReferencia?: string,
    @Query('unitId') unitId?: string,
    @Query('status') status?: StatusPedidoCompra,
  ) {
    return this.svc.listar(user, { mesReferencia, unitId, status });
  }

  /**
   * GET /pedidos-compra/:id
   * Busca um pedido pelo ID.
   * RBAC: UNIDADE (própria), STAFF_CENTRAL, MANTENEDORA, DEVELOPER
   */
  @Get(':id')
  @RequireRoles(
    RoleLevel.UNIDADE,
    RoleLevel.STAFF_CENTRAL,
    RoleLevel.MANTENEDORA,
    RoleLevel.DEVELOPER,
  )
  buscarPorId(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.svc.buscarPorId(id, user);
  }

  /**
   * PATCH /pedidos-compra/:id/status
   * Atualiza o status de um pedido.
   * RBAC:
   *   - UNIDADE: pode ENVIAR ou CANCELAR o próprio pedido
   *   - MANTENEDORA/DEVELOPER: pode mudar para qualquer status
   */
  @Patch(':id/status')
  @RequireRoles(RoleLevel.UNIDADE, RoleLevel.MANTENEDORA, RoleLevel.DEVELOPER)
  atualizarStatus(
    @Param('id') id: string,
    @Body() dto: AtualizarStatusPedidoDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.svc.atualizarStatus(id, dto, user);
  }
}
