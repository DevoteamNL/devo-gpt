export type ConfigService = {
  get(key: string): string;
};

export type LoggerService = {
  log(message: string): void;
};

import { FunctionDefinition as FunctionDefinitionType } from '@azure/openai';
export type FunctionDefinition = FunctionDefinitionType & {
  followUpPrompt: string;
  followUpTemperature?: number;
  clearAfterExecution?: boolean;
  followUpModel?: 'gpt-35-turbo-16k' | 'gpt-35-turbo' | 'gpt-4' | 'gpt-4-32k';
};

export abstract class Plugin {
  // eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars
  constructor(_configService: ConfigService, _loggerService: LoggerService) {}
  abstract getFunctionDefinitions(): FunctionDefinition[];
  abstract executeFunction(
    name: string,
    args: string,
    senderEmail: string,
  ): Promise<string>;
}
