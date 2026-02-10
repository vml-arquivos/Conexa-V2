import { IsEnum } from 'class-validator';

export enum ReviewDecision {
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export class ReviewMaterialRequestDto {
  @IsEnum(ReviewDecision)
  decision: ReviewDecision;
}
