import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { MetricsModule } from './metrics/metrics.module';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { RedisCacheModule } from './cache/redis-cache.module';
import { AuthModule } from './auth/auth.module';
import { ExampleModule } from './example/example.module';
import { DiaryEventModule } from './diary-event/diary-event.module';
import { PlanningTemplateModule } from './planning-template/planning-template.module';
import { PlanningModule } from './planning/planning.module';
import { CurriculumMatrixModule } from './curriculum-matrix/curriculum-matrix.module';
import { CurriculumMatrixEntryModule } from './curriculum-matrix-entry/curriculum-matrix-entry.module';
import { CurriculumImportModule } from './curriculum-import/curriculum-import.module';
import { HealthModule } from './health/health.module';
import { ReportsModule } from './reports/reports.module';
import { MaterialRequestModule } from './material-request/material-request.module';
import { LookupModule } from './lookup/lookup.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { AdminModule } from './admin/admin.module';
import { PedidoCompraModule } from './pedido-compra/pedido-compra.module';
import { IaAssistivaModule } from './ia-assistiva/ia-assistiva.module';
import { ClassroomsModule } from './classrooms/classrooms.module';
import { AtendimentoPaisModule } from './atendimento-pais/atendimento-pais.module';

@Module({
  imports: [
    AdminModule,
    EventEmitterModule.forRoot({ global: true }),
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
    ReportsModule,
    RedisCacheModule,
    MetricsModule,
    MaterialRequestModule,
    LookupModule,
    PedidoCompraModule,
    IaAssistivaModule,
    ClassroomsModule,
    AtendimentoPaisModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
