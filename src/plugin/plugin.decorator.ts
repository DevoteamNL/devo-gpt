import { ConfigService } from './types';

export type PluginPrototype = {
  new (configService: ConfigService): unknown;
};
const plugins: Array<PluginPrototype> = [];
export function Plugin<T extends PluginPrototype>(constructor: T) {
  plugins.push(constructor);
  return constructor;
}

const initializedPlugins: Array<unknown> = [];

export const initializePlugins = (configService: ConfigService) => {
  if (initializedPlugins.length > 0) {
    return;
  }
  initializedPlugins.push(
    ...plugins.map((plugin) => new plugin(configService)),
  );
};

export const findPlugin = (pluginName: string) => {
  return initializedPlugins.find((p) => p.constructor.name === pluginName);
};
