import { PartialType } from '@nestjs/mapped-types';
import { CreateDiaryEventDto } from './create-diary-event.dto';

export class UpdateDiaryEventDto extends PartialType(CreateDiaryEventDto) {}
