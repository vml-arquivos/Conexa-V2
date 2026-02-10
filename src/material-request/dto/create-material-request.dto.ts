import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min, Matches } from 'class-validator';

export enum MaterialRequestTypeInput {
  HYGIENE = 'HYGIENE',
  PEDAGOGICAL = 'PEDAGOGICAL',
}

const CUID_REGEX = /^c[a-z0-9]{24,}$/i;

export class CreateMaterialRequestDto {
  @IsString()
  @IsNotEmpty()
  item: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsEnum(MaterialRequestTypeInput)
  type: MaterialRequestTypeInput;

  @IsOptional()
  @IsString()
  @Matches(CUID_REGEX, { message: 'childId deve ser CUID' })
  childId?: string;
}
