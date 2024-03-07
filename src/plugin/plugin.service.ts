import { Injectable } from '@nestjs/common';
import { definitions } from './definition.decorator';
import { findPlugin, pluginsByDisplayName } from './plugin.decorator';
import './plugins/joan.plugin';
import './plugins/cv.plugin';
import { initializePlugins } from './plugin.decorator';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PluginService {
  constructor(configService: ConfigService) {
    initializePlugins(configService);
  }

  public get functionDefinitions() {
    return definitions;
  }

  public get availablePlugins() {
    return Object.entries(pluginsByDisplayName()).map(([name, plugin]) => ({
      displayName: name,
      name: plugin.name,
    }));
  }

  public findDefinition(functionName: string) {
    return definitions.find((d) => d.name === functionName);
  }

  public executeFunction(
    functionName: string,
    params: string,
    senderEmail: string,
  ) {
    const [service, name] = functionName.split('-');
    const plugin = findPlugin(service);
    if (!plugin) {
      throw new Error(`No plugin found for function ${functionName}`);
    }
    const args = JSON.parse(params);
    return plugin[name]({ ...args, senderEmail });
  }
}
