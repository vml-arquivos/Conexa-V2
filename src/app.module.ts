import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ExampleModule } from './example/example.module';
import { DiaryEventModule } from './diary-event/diary-event.module';
import { PlanningTemplateModule } from './planning-template/planning-template.module';
import { PlanningModule } from './planning/planning.module';
import { CurriculumMatrixModule } from './curriculum-matrix/curriculum-matrix.module';
import { CurriculumMatrixEntryModule } from './curriculum-matrix-entry/curriculum-matrix-entry.module';
import { CurriculumImportModule } from './curriculum-import/curriculum-import.module';
import { HealthModule } from './health/health.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    AuthModule,
    ExampleModule,
    DiaryEventModule,
    PlanningTemplateModule,
    PlanningModule,
    CurriculumMatrixModule,
    CurriculumMatrixEntryModule,
    CurriculumImportModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard, // Aplicar JwtAuthGuard globalmente
    },
  ],
})
export class AppModule {}
