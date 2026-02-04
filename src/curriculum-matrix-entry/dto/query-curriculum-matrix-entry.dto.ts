import { IsOptional, IsString, IsInt, IsDateString, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { CampoDeExperiencia } from './create-curriculum-matrix-entry.dto';

export class QueryCurriculumMatrixEntryDto {
  @IsOptional()
  @IsString()
  matrixId?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  weekOfYear?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  dayOfWeek?: number;

  @IsOptional()
  @IsEnum(CampoDeExperiencia)
  campoDeExperiencia?: CampoDeExperiencia;
}
