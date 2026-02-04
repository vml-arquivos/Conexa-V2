import { IsString, IsInt, IsOptional, IsBoolean, Min, Max, Length } from 'class-validator';

export class CreateCurriculumMatrixDto {
  @IsString()
  @Length(1, 255)
  name: string;

  @IsInt()
  @Min(2020)
  @Max(2100)
  year: number;

  @IsString()
  @Length(4, 10)
  segment: string; // Ex: "EI01", "EI02", "EI03"

  @IsOptional()
  @IsInt()
  @Min(1)
  version?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @Length(1, 500)
  sourceUrl?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
