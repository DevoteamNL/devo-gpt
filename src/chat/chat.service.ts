import { Injectable, Logger } from '@nestjs/common';
import { OpenAI } from 'langchain/llms/openai';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from 'langchain/chat_models/openai';
import { OpenAIModel } from '../config/constants';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private readonly model: OpenAI;
  private readonly chatModel;

  constructor(private readonly configService: ConfigService) {
    this.model = new OpenAI({
      temperature: 0.9,
      azureOpenAIApiKey: this.configService.get<string>('AZURE_OPENAI_API_KEY'),
      azureOpenAIApiVersion: '2023-07-01-preview',
      azureOpenAIApiDeploymentName: OpenAIModel.gpt35_Turbo16kDeployment,
      azureOpenAIBasePath:
        'https://swedencentral.api.cognitive.microsoft.com/openai/deployments', // In Node.js defaults to process.env.AZURE_OPENAI_BASE_PATH
    });
    this.chatModel = new ChatOpenAI({
      temperature: 0.9,
      azureOpenAIApiKey: this.configService.get<string>('AZURE_OPENAI_API_KEY'),
      azureOpenAIApiVersion: '2023-07-01-preview',
      azureOpenAIApiDeploymentName: OpenAIModel.gpt35_Turbo16kDeployment,
      azureOpenAIBasePath:
        'https://swedencentral.api.cognitive.microsoft.com/openai/deployments', // In Node.js defaults to process.env.AZURE_OPENAI_BASE_PATH
    });
  }

  async chat(message: string) {
    const res = await this.chatModel.predict(
      'What would be a good company name for a company that makes colorful socks?',
    );
    console.log({ res });
    return res;
  }
}
