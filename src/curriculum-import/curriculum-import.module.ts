import { Module } from '@nestjs/common';
import { CurriculumImportController } from './curriculum-import.controller';
import { CurriculumImportService } from './curriculum-import.service';
import { CurriculumPdfParserService } from './curriculum-pdf-parser.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditService } from '../common/services/audit.service';

@Module({
  imports: [PrismaModule],
  controllers: [CurriculumImportController],
  providers: [CurriculumImportService, CurriculumPdfParserService, AuditService],
  exports: [CurriculumImportService],
})
export class CurriculumImportModule {}
