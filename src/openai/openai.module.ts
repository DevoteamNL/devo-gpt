import { forwardRef, Module } from '@nestjs/common';
import { OpenaiService } from './openai.service';
import { ConfigModule } from '@nestjs/config';
import { CognitiveSearchModule } from '../cognitive-search/cognitive-search.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { EmployeesModule } from '../employees/employees.module';
import { UtilsModule } from '../utils/utils.module';
import { OpenaiChatService } from './openai-chat.service';
import { MessageModule } from '../message/message.module';
import { AzureOpenAIClientService } from './azure-openai-client.service';

@Module({
  imports: [
    ConfigModule,
    forwardRef(() => EmployeesModule),
    IntegrationsModule,
    UtilsModule,
    MessageModule,
  ],
  providers: [OpenaiService, OpenaiChatService, AzureOpenAIClientService],
  exports: [OpenaiService, OpenaiChatService, AzureOpenAIClientService],
})
export class OpenaiModule {}
