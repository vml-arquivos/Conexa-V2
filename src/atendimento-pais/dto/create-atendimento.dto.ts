import { IsString, IsOptional, IsBoolean, IsEnum, IsDateString } from 'class-validator';
import { TipoAtendimento } from '@prisma/client';

export class CreateAtendimentoDto {
  @IsString()
  childId: string;

  @IsString()
  responsavelNome: string;

  @IsOptional()
  @IsString()
  responsavelRelacao?: string;

  @IsOptional()
  @IsString()
  responsavelContato?: string;

  @IsEnum(TipoAtendimento)
  tipo: TipoAtendimento;

  @IsDateString()
  dataAtendimento: string;

  @IsString()
  assunto: string;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsOptional()
  @IsString()
  encaminhamento?: string;

  @IsOptional()
  @IsBoolean()
  retornoNecessario?: boolean;

  @IsOptional()
  @IsDateString()
  dataRetorno?: string;
}
