import { Controller, Get, UseGuards } from '@nestjs/common';
import { GoogleTokenGuard } from 'src/auth/guards/google-token.guard';
import { PluginService } from './plugin.service';

@UseGuards(GoogleTokenGuard)
@Controller('plugin')
export class PluginController {
  constructor(private readonly pluginService: PluginService) {}

  @Get()
  listPlugins() {
    return this.pluginService.availablePlugins;
  }
}
