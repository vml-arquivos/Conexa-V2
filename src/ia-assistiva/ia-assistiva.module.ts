import { Module } from '@nestjs/common';
import { IaAssistivaService } from './ia-assistiva.service';
import { IaAssistivaController } from './ia-assistiva.controller';

@Module({
  controllers: [IaAssistivaController],
  providers: [IaAssistivaService],
  exports: [IaAssistivaService],
})
export class IaAssistivaModule {}
