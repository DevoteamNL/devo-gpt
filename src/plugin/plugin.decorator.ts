import { ConfigService } from './types';
import { CognitiveSearchService } from '../cognitive-search/cognitive-search.service';

export type PluginPrototype = {
  new (
    configService: ConfigService,
    cognitiveSearchService: CognitiveSearchService,
  ): unknown;
};
const plugins: Record<string, PluginPrototype> = {};

export function Plugin(metadata: { displayName: string }) {
  return function actualDecorator<T extends PluginPrototype>(constructor: T) {
    plugins[metadata.displayName] = constructor;
    return constructor;
  };
}

const initializedPlugins: Array<unknown> = [];

export const initializePlugins = (
  configService: ConfigService,
  cognitiveSearchService: CognitiveSearchService,
) => {
  if (initializedPlugins.length > 0) {
    return;
  }
  initializedPlugins.push(
    ...Object.values(plugins).map(
      (plugin) => new plugin(configService, cognitiveSearchService),
    ),
  );
};

export const findPlugin = (pluginName: string) => {
  return initializedPlugins.find((p) => p.constructor.name === pluginName);
};

export const pluginsByDisplayName = () => {
  return plugins;
};
