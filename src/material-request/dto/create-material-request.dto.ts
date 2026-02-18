import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  Matches,
  IsArray,
  ValidateNested,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Enum compatível com o schema Prisma (MaterialRequestType)
 */
export enum MaterialRequestTypeInput {
  HIGIENE = 'HIGIENE',
  LIMPEZA = 'LIMPEZA',
  PEDAGOGICO = 'PEDAGOGICO',
  ALIMENTACAO = 'ALIMENTACAO',
  OUTRO = 'OUTRO',
  // Compat legado
  HYGIENE = 'HYGIENE',
  PEDAGOGICAL = 'PEDAGOGICAL',
}

export enum UrgenciaLevel {
  BAIXA = 'BAIXA',
  MEDIA = 'MEDIA',
  ALTA = 'ALTA',
}

const CUID_REGEX = /^c[a-z0-9]{24,}$/i;

export class MaterialRequestItemDto {
  @IsString()
  @IsNotEmpty()
  item: string;

  @IsNumber()
  @Min(1)
  quantidade: number;

  @IsOptional()
  @IsString()
  unidade?: string;
}

export class CreateMaterialRequestDto {
  /** Campo legado: item único */
  @IsOptional()
  @IsString()
  item?: string;

  /** Campo legado: quantidade */
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  /** Campo legado: tipo */
  @IsOptional()
  @IsEnum(MaterialRequestTypeInput)
  type?: MaterialRequestTypeInput;

  /** Categoria do material (novo) */
  @IsOptional()
  @IsEnum(MaterialRequestTypeInput)
  categoria?: MaterialRequestTypeInput;

  /** Título descritivo da requisição */
  @IsOptional()
  @IsString()
  titulo?: string;

  /** Descrição/observações adicionais */
  @IsOptional()
  @IsString()
  descricao?: string;

  /** Justificativa obrigatória */
  @IsOptional()
  @IsString()
  justificativa?: string;

  /** Nível de urgência */
  @IsOptional()
  @IsEnum(UrgenciaLevel)
  urgencia?: UrgenciaLevel;

  /** Lista de itens da requisição */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MaterialRequestItemDto)
  itens?: MaterialRequestItemDto[];

  /** ID da turma (opcional) */
  @IsOptional()
  @IsString()
  @Matches(CUID_REGEX, { message: 'classroomId deve ser CUID' })
  classroomId?: string;

  /** ID da criança (opcional, legado) */
  @IsOptional()
  @IsString()
  @Matches(CUID_REGEX, { message: 'childId deve ser CUID' })
  childId?: string;
}
