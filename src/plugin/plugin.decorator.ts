import { ConfigService } from './types';

export type PluginPrototype = {
  new (configService: ConfigService): unknown;
};
const plugins: Record<string, PluginPrototype> = {};

export function Plugin(metadata: { displayName: string }) {
  return function actualDecorator<T extends PluginPrototype>(constructor: T) {
    plugins[metadata.displayName] = constructor;
    return constructor;
  };
}

const initializedPlugins: Array<unknown> = [];

export const initializePlugins = (configService: ConfigService) => {
  if (initializedPlugins.length > 0) {
    return;
  }
  initializedPlugins.push(
    ...Object.values(plugins).map((plugin) => new plugin(configService)),
  );
};

export const findPlugin = (pluginName: string) => {
  return initializedPlugins.find((p) => p.constructor.name === pluginName);
};

export const pluginsByDisplayName = () => {
  return plugins;
};
