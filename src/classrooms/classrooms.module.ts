import { Module } from '@nestjs/common';
import { ClassroomsController } from './classrooms.controller';
import { LookupModule } from '../lookup/lookup.module';

@Module({
  imports: [LookupModule],
  controllers: [ClassroomsController],
})
export class ClassroomsModule {}
