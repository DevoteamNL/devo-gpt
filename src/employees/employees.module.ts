import { forwardRef, Module } from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { CognitiveSearchModule } from '../cognitive-search/cognitive-search.module';

@Module({
  imports: [forwardRef(() => CognitiveSearchModule)],
  providers: [EmployeesService],
  exports: [EmployeesService],
})
export class EmployeesModule {
}
