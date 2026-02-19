import { IsEnum, IsOptional, IsString } from 'class-validator';
import { StatusPedidoCompra } from '@prisma/client';

/**
 * DTO para atualizar o status de um Pedido de Compra.
 */
export class AtualizarStatusPedidoDto {
  /**
   * Novo status do pedido
   */
  @IsEnum(StatusPedidoCompra, {
    message: `status deve ser um dos valores: ${Object.values(StatusPedidoCompra).join(', ')}`,
  })
  status: StatusPedidoCompra;

  /**
   * Observações sobre a mudança de status
   */
  @IsOptional()
  @IsString()
  observacoes?: string;
}
