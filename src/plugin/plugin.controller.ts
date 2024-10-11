import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { GoogleTokenGuard } from 'src/auth/guards/google-token.guard';
import { PluginService } from './plugin.service';

@UseGuards(GoogleTokenGuard)
@Controller('plugin')
export class PluginController {
  constructor(private readonly pluginService: PluginService) {}

  @Get()
  listPlugins(@Request() req) {
    const { plugins = [] } = req.user;
    return this.pluginService.availablePlugins.filter((plugin) => {
      return plugins.length > 0 && plugins.includes(plugin.displayName);
    });
  }
}
