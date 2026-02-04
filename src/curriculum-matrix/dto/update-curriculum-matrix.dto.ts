import { PartialType } from '@nestjs/mapped-types';
import { CreateCurriculumMatrixDto } from './create-curriculum-matrix.dto';

export class UpdateCurriculumMatrixDto extends PartialType(CreateCurriculumMatrixDto) {}
