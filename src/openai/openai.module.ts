import { forwardRef, Module } from '@nestjs/common';
import { OpenaiService } from './openai.service';
import { ConfigModule } from '@nestjs/config';
import { CognitiveSearchModule } from '../cognitive-search/cognitive-search.module';
import { IntegrationsModule } from '../integrations/integrations.module';

@Module({
  imports: [
    ConfigModule,
    forwardRef(() => CognitiveSearchModule),
    IntegrationsModule,
  ],
  providers: [OpenaiService],
  exports: [OpenaiService],
})
export class OpenaiModule {}
