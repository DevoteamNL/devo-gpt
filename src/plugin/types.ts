import { FunctionDefinition as FunctionDefinitionType } from '@azure/openai';
import { OpenAIModel } from '../config/constants';

export type ConfigService = {
  get(key: string): string;
};

export type FunctionDefinition = FunctionDefinitionType & {
  followUpPrompt: string;
  followUpTemperature?: number;
  clearAfterExecution?: boolean;
  followUpModel?:
    | OpenAIModel.gpt35_Turbo16kDeployment
    | OpenAIModel.gpt35_TurboDeployment
    | OpenAIModel.gpt4_Deployment
    | OpenAIModel.gpt4_32K_Deployment
    | OpenAIModel.gpt4_o_Deployment;
};
