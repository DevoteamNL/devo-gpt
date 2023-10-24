import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AzureKeyCredential, OpenAIClient } from '@azure/openai';

@Injectable()
export class OpenaiService {
  private readonly logger = new Logger(OpenaiService.name);
  private readonly openai;
  constructor(private readonly configService: ConfigService) {
    this.openai = new OpenAIClient(
      // 'https://swedencentral.openai.azure.com',
      'https://swedencentral.api.cognitive.microsoft.com/',
      new AzureKeyCredential(
        this.configService.get<string>('AZURE_OPENAI_API_KEY'),
      ),
    );
  }
  async getChatResponse(context, senderName, message) {
    // log first 50 words from of message
    this.logger.log(`Generating chat response for: #####`);
    this.logger.log(message.split(' ').slice(0, 50).join(' '));

    try {
      const completion = await this.openai.getChatCompletions('gpt-4-32k', [
        {
          role: 'system',
          content:
            'You are a chatbot assistant who can answer question based on context user has provided.' +
            "if you don't find answer, say it do not know the answer. You can personalize response, " +
            'use users name or emojis and make it non professional response. \n\n\n\n\n' +
            context,
        },
        { role: 'user', content: `My name is ${senderName} \n\n\n` + message },
      ]);
      this.logger.log(completion.choices[0].message);
      return completion.choices[0].message;
    } catch (error) {
      this.logger.log(error);
      throw error;
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    // Use OpenAI embeddings API endpoint with text-embedding-ada-002 model
    this.logger.log(`Generating embedding`);
    try {
      const response = await this.openai.getEmbeddings(
        'text-embedding-ada-002',
        [text],
      );
      // this.logger.debug(response.data['0'].embedding);
      // Return the embedding vector
      return response.data['0'].embedding;
    } catch (error) {
      this.logger.log(error);
      throw error;
    }
  }
}
