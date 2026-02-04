import { IsEnum, IsNotEmpty } from 'class-validator';
import { PlanningStatus } from '@prisma/client';

export class ChangeStatusDto {
  @IsEnum(PlanningStatus)
  @IsNotEmpty()
  status: PlanningStatus;
}
