import { forwardRef, Module } from '@nestjs/common';
import { OpenaiService } from './openai.service';
import { ConfigModule } from '@nestjs/config';
import { IntegrationsModule } from '../integrations/integrations.module';
import { UtilsModule } from '../utils/utils.module';
import { OpenaiChatService } from './openai-chat.service';
import { MessageModule } from '../message/message.module';
import { AzureOpenAIClientService } from './azure-openai-client.service';
import { PluginModule } from '../plugin';

@Module({
  imports: [
    ConfigModule,
    IntegrationsModule,
    UtilsModule,
    MessageModule,
    forwardRef(() => PluginModule),
  ],
  providers: [OpenaiService, OpenaiChatService, AzureOpenAIClientService],
  exports: [OpenaiService, OpenaiChatService, AzureOpenAIClientService],
})
export class OpenaiModule {}
