export type ConfigService = {
  get(key: string): string;
};

import { FunctionDefinition as FunctionDefinitionType } from '@azure/openai';
export type FunctionDefinition = FunctionDefinitionType & {
  followUpPrompt: string;
  followUpTemperature?: number;
  clearAfterExecution?: boolean;
  followUpModel?: 'gpt-35-turbo-16k' | 'gpt-35-turbo' | 'gpt-4' | 'gpt-4-32k';
};
