import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateCurriculumMatrixEntryDto } from './create-curriculum-matrix-entry.dto';

// Não permitir alterar matrixId, date, objetivos BNCC/Currículo após criação
export class UpdateCurriculumMatrixEntryDto extends PartialType(
  OmitType(CreateCurriculumMatrixEntryDto, [
    'matrixId',
    'date',
    'campoDeExperiencia',
    'objetivoBNCC',
    'objetivoCurriculo',
  ] as const),
) {}
