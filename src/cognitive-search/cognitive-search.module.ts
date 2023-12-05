import { forwardRef, Module } from '@nestjs/common';
import { CognitiveSearchService } from './cognitive-search.service';
import { ConfigModule } from '@nestjs/config';
import { OpenaiModule } from '../openai/openai.module';
import { CognitiveSearchController } from './cognitive-search.controller';

@Module({
  imports: [ConfigModule, forwardRef(() => OpenaiModule)],
  providers: [CognitiveSearchService],
  exports: [CognitiveSearchService],
  controllers: [CognitiveSearchController],
})
export class CognitiveSearchModule {}
