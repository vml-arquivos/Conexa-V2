import { IsOptional, IsString, IsEnum, IsDateString } from 'class-validator';
import { PlanningStatus, PlanningType } from '@prisma/client';

export class QueryPlanningDto {
  @IsString()
  @IsOptional()
  classroomId?: string;

  @IsString()
  @IsOptional()
  unitId?: string;

  @IsString()
  @IsOptional()
  templateId?: string;

  @IsEnum(PlanningStatus)
  @IsOptional()
  status?: PlanningStatus;

  @IsEnum(PlanningType)
  @IsOptional()
  type?: PlanningType;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;
}
