import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsArray,
  IsObject,
  IsDateString,
} from 'class-validator';
import { DiaryEventType } from '@prisma/client';

export class CreateDiaryEventDto {
  @IsEnum(DiaryEventType)
  @IsNotEmpty()
  type: DiaryEventType;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsDateString()
  @IsNotEmpty()
  eventDate: string; // Data do evento (obrigatório para rastreabilidade)

  @IsString()
  @IsNotEmpty()
  childId: string;

  @IsString()
  @IsNotEmpty()
  classroomId: string;

  @IsString()
  @IsNotEmpty()
  planningId: string; // OBRIGATÓRIO: Vínculo com planejamento semanal

  @IsString()
  @IsNotEmpty()
  curriculumEntryId: string; // OBRIGATÓRIO: Vínculo com entrada da matriz curricular

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsObject()
  @IsOptional()
  aiContext?: Record<string, any>;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  mediaUrls?: string[];
}
