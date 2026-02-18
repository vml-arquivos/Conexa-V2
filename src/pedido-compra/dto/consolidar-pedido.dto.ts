import { IsString, Matches, IsOptional } from 'class-validator';

/**
 * DTO para consolidar requisições de materiais aprovadas em um Pedido de Compra mensal.
 */
export class ConsolidarPedidoDto {
  /**
   * Mês de referência no formato YYYY-MM (ex.: 2026-03)
   */
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, {
    message: 'mesReferencia deve estar no formato YYYY-MM (ex.: 2026-03)',
  })
  mesReferencia: string;

  /**
   * ID da unidade a consolidar.
   * Se não informado, usa a unidade do usuário autenticado.
   */
  @IsOptional()
  @IsString()
  unitId?: string;

  /**
   * Observações adicionais da unidade
   */
  @IsOptional()
  @IsString()
  observacoes?: string;
}
