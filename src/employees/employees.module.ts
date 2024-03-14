import { Module } from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { CognitiveSearchModule } from '../cognitive-search/cognitive-search.module';

@Module({
  providers: [EmployeesService],
  exports: [EmployeesService],
})
export class EmployeesModule {}
