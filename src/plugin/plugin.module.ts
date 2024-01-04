import { Module } from '@nestjs/common';
import { PluginService } from './plugin.service';
import { PluginController } from './plugin.controller';

@Module({
  providers: [PluginService],
  exports: [PluginService],
  controllers: [PluginController],
})
export class PluginModule {}
