import { Module } from '@nestjs/common';
import { CurriculumMatrixEntryService } from './curriculum-matrix-entry.service';
import { CurriculumMatrixEntryController } from './curriculum-matrix-entry.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditService } from '../common/services/audit.service';

@Module({
  imports: [PrismaModule],
  controllers: [CurriculumMatrixEntryController],
  providers: [CurriculumMatrixEntryService, AuditService],
  exports: [CurriculumMatrixEntryService],
})
export class CurriculumMatrixEntryModule {}
