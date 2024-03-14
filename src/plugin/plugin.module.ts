import { forwardRef, Module } from '@nestjs/common';
import { PluginService } from './plugin.service';
import { PluginController } from './plugin.controller';
import { OpenaiModule } from '../openai/openai.module';
import { CognitiveSearchModule } from '../cognitive-search/cognitive-search.module';

@Module({
  imports: [
    forwardRef(() => CognitiveSearchModule),
    forwardRef(() => OpenaiModule),
  ],
  providers: [PluginService],
  exports: [PluginService],
  controllers: [PluginController],
})
export class PluginModule {}
