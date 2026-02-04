import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsObject,
  IsOptional,
  IsEnum,
  Length,
} from 'class-validator';

export enum PlanningType {
  SEMANAL = 'SEMANAL',
  MENSAL = 'MENSAL',
  TRIMESTRAL = 'TRIMESTRAL',
  SEMESTRAL = 'SEMESTRAL',
  ANUAL = 'ANUAL',
}

export class CreatePlanningDto {
  @IsString()
  @IsNotEmpty()
  classroomId: string;

  @IsOptional()
  @IsString()
  templateId?: string;

  @IsOptional()
  @IsString()
  curriculumMatrixId?: string; // NOVO: Vínculo com matriz curricular

  @IsString()
  @IsNotEmpty()
  @Length(1, 255)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(PlanningType)
  type: PlanningType;

  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  // Campos legados (mantidos para compatibilidade)
  @IsObject()
  @IsOptional()
  objectives?: Record<string, any>;

  @IsObject()
  @IsOptional()
  activities?: Record<string, any>;

  @IsObject()
  @IsOptional()
  resources?: Record<string, any>;

  @IsOptional()
  @IsString()
  evaluation?: string;

  @IsObject()
  @IsOptional()
  bnccAreas?: Record<string, any>;

  @IsOptional()
  @IsString()
  curriculumAlignment?: string;

  // NOVO: Conteúdo pedagógico de autoria docente
  @IsObject()
  @IsOptional()
  pedagogicalContent?: Record<string, any>; // Experiências, materiais e estratégias por dia
}
