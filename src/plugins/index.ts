import { definitions } from './function-definition.decorator';
import { JoanPlugin } from './joan.plugin';
import { ConfigService, LoggerService, Plugin } from './types';
const pluginClasses = [JoanPlugin];
let plugins: Plugin[] = [];

export const initializePlugins = (
  configService: ConfigService,
  logger: LoggerService,
) => {
  plugins = pluginClasses.map((plugin) => new plugin(configService, logger));
};

export const functionDefinitions = () => {
  return definitions;
};

export const getFunctionDefinition = (functionName: string) => {
  return definitions.find((d) => d.name === functionName);
};

export const executeFunction = async (
  functionName: string,
  params: string,
  senderEmail: string,
): Promise<string> => {
  const [service, name] = functionName.split('-');
  const plugin = plugins.find((p: Plugin) => p.constructor.name === service);
  if (!plugin) {
    throw new Error(`No plugin found for function ${functionName}`);
  }
  const args = JSON.parse(params);
  return await plugin[name]({ ...args, senderEmail });
};

export * from './types';
