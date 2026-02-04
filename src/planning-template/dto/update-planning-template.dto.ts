import { PartialType } from '@nestjs/mapped-types';
import { CreatePlanningTemplateDto } from './create-planning-template.dto';

export class UpdatePlanningTemplateDto extends PartialType(
  CreatePlanningTemplateDto,
) {}
