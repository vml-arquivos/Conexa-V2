import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsObject,
  IsOptional,
} from 'class-validator';
import { PlanningType } from '@prisma/client';

export class CreatePlanningTemplateDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsEnum(PlanningType)
  @IsNotEmpty()
  type: PlanningType;

  @IsObject()
  @IsNotEmpty()
  sections: Record<string, any>;

  @IsObject()
  @IsNotEmpty()
  fields: Record<string, any>;

  @IsString()
  @IsOptional()
  mantenedoraId?: string;
}
