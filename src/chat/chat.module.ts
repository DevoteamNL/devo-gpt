import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { CognitiveSearchModule } from '../cognitive-search/cognitive-search.module';
import { OpenaiModule } from '../openai/openai.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { UtilsModule } from '../utils/utils.module';

@Module({
  imports: [
    CognitiveSearchModule,
    OpenaiModule,
    IntegrationsModule,
    UtilsModule,
  ],
  providers: [ChatService],
  controllers: [ChatController],
})
export class ChatModule {
}
