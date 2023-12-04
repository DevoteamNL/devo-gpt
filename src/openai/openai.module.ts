import { forwardRef, Module } from '@nestjs/common';
import { OpenaiService } from './openai.service';
import { ConfigModule } from '@nestjs/config';
import { CognitiveSearchModule } from '../cognitive-search/cognitive-search.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { EmployeesModule } from '../employees/employees.module';
import { UtilsModule } from '../utils/utils.module';

@Module({
  imports: [
    ConfigModule,
    forwardRef(() => EmployeesModule),
    IntegrationsModule,
    UtilsModule,
  ],
  providers: [OpenaiService],
  exports: [OpenaiService],
})
export class OpenaiModule {
}
