import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AzureChatOpenAI } from '@langchain/openai';

@Injectable()
export class AzureOpenAIService {
  public readonly defaultChatModel: AzureChatOpenAI;
  private readonly azureOpenAIConfig = {};

  constructor(private readonly configService: ConfigService) {
    this.azureOpenAIConfig = {
      // In Node.js defaults to process.env.AZURE_OPENAI_API_KEY
      azureOpenAIApiKey: this.configService.get<string>('AZURE_OPENAI_API_KEY'),
      // In Node.js defaults to process.env.AZURE_OPENAI_API_VERSION
      azureOpenAIApiVersion: this.configService.get<string>(
        'AZURE_OPENAI_VERSION',
      ),
      // In Node.js defaults to process.env.AZURE_OPENAI_BASE_PATH
      azureOpenAIBasePath: this.configService.get<string>(
        'AZURE_OPENAI_ENDPOINT',
      ),
    };
    this.defaultChatModel = this.getChatModel();
  }

  getChatModel = ({
    temperature = 0.9,
    // In Node.js defaults to process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME
    openAIModel = this.configService.get<string>('AZURE_OPENAI_DEPLOYMENT'),
  } = {}) => {
    return new AzureChatOpenAI({
      ...this.azureOpenAIConfig,
      temperature,
      azureOpenAIApiDeploymentName: openAIModel,
    });
  };
}
