import { PartialType } from '@nestjs/mapped-types';
import { CreatePlanningDto } from './create-planning.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { PlanningStatus } from '@prisma/client';

export class UpdatePlanningDto extends PartialType(CreatePlanningDto) {
  @IsEnum(PlanningStatus)
  @IsOptional()
  status?: PlanningStatus;
}
