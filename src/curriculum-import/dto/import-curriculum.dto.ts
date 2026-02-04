import { IsString, IsNotEmpty, IsInt, IsEnum, IsOptional, IsBoolean } from 'class-validator';

export enum ImportMode {
  DRY_RUN = 'DRY_RUN',
  APPLY = 'APPLY',
}

export class ImportCurriculumDto {
  @IsString()
  @IsNotEmpty()
  mantenedoraId: string;

  @IsInt()
  @IsNotEmpty()
  year: number;

  @IsString()
  @IsNotEmpty()
  segment: string; // Ex: "EI02"

  @IsInt()
  @IsNotEmpty()
  version: number;

  @IsString()
  @IsNotEmpty()
  sourceUrl: string; // Caminho do PDF ou URL

  @IsEnum(ImportMode)
  @IsNotEmpty()
  mode: ImportMode;

  @IsBoolean()
  @IsOptional()
  force?: boolean; // Forçar atualização de campos normativos
}

export class ImportMatrixDto {
  @IsString()
  @IsNotEmpty()
  sourceUrl: string; // Caminho do PDF ou URL

  @IsEnum(ImportMode)
  @IsNotEmpty()
  mode: ImportMode;

  @IsBoolean()
  @IsOptional()
  force?: boolean; // Forçar atualização de campos normativos
}
