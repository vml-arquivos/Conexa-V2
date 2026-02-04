import { Module } from '@nestjs/common';
import { CurriculumMatrixService } from './curriculum-matrix.service';
import { CurriculumMatrixController } from './curriculum-matrix.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditService } from '../common/services/audit.service';

@Module({
  imports: [PrismaModule],
  controllers: [CurriculumMatrixController],
  providers: [CurriculumMatrixService, AuditService],
  exports: [CurriculumMatrixService],
})
export class CurriculumMatrixModule {}
