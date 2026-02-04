import { IsOptional, IsString, IsEnum } from 'class-validator';
import { PlanningType } from '@prisma/client';

export class QueryPlanningTemplateDto {
  @IsString()
  @IsOptional()
  mantenedoraId?: string;

  @IsEnum(PlanningType)
  @IsOptional()
  type?: PlanningType;

  @IsString()
  @IsOptional()
  search?: string;
}
