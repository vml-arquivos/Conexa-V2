import { IsOptional, IsString, IsDateString, IsEnum } from 'class-validator';
import { DiaryEventType } from '@prisma/client';

export class QueryDiaryEventDto {
  @IsString()
  @IsOptional()
  childId?: string;

  @IsString()
  @IsOptional()
  classroomId?: string;

  @IsString()
  @IsOptional()
  unitId?: string;

  @IsEnum(DiaryEventType)
  @IsOptional()
  type?: DiaryEventType;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  createdBy?: string;
}
