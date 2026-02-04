import { IsString, IsInt, IsDateString, IsOptional, IsEnum, Min, Max } from 'class-validator';

export enum CampoDeExperiencia {
  O_EU_O_OUTRO_E_O_NOS = 'O_EU_O_OUTRO_E_O_NOS',
  CORPO_GESTOS_E_MOVIMENTOS = 'CORPO_GESTOS_E_MOVIMENTOS',
  TRACOS_SONS_CORES_E_FORMAS = 'TRACOS_SONS_CORES_E_FORMAS',
  ESCUTA_FALA_PENSAMENTO_E_IMAGINACAO = 'ESCUTA_FALA_PENSAMENTO_E_IMAGINACAO',
  ESPACOS_TEMPOS_QUANTIDADES_RELACOES_E_TRANSFORMACOES = 'ESPACOS_TEMPOS_QUANTIDADES_RELACOES_E_TRANSFORMACOES',
}

export class CreateCurriculumMatrixEntryDto {
  @IsString()
  matrixId: string;

  @IsDateString()
  date: string; // ISO 8601 format

  @IsInt()
  @Min(1)
  @Max(53)
  weekOfYear: number;

  @IsInt()
  @Min(1)
  @Max(5)
  dayOfWeek: number; // 1=Segunda, 2=Terça, ..., 5=Sexta

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(4)
  bimester?: number;

  @IsEnum(CampoDeExperiencia)
  campoDeExperiencia: CampoDeExperiencia;

  @IsString()
  objetivoBNCC: string;

  @IsOptional()
  @IsString()
  objetivoBNCCCode?: string; // Ex: "EI01EO03"

  @IsString()
  objetivoCurriculo: string;

  @IsOptional()
  @IsString()
  intencionalidade?: string;

  @IsOptional()
  @IsString()
  exemploAtividade?: string;
}
