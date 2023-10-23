import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AzureKeyCredential, OpenAIClient } from '@azure/openai';

@Injectable()
export class OpenaiService {
  private readonly logger = new Logger(OpenaiService.name);
  private readonly openai;
  constructor(private readonly configService: ConfigService) {
    this.openai = new OpenAIClient(
      'https://swedencentral.openai.azure.com',
      new AzureKeyCredential(
        this.configService.get<string>('AZURE_OPENAI_API_KEY'),
      ),
    );
  }
  async getChatResponse(message) {
    const completion = await this.openai.getCompletions({
      model: 'gpt-4-32k',
      temperature: 0.7,
      max_tokens: 100,
      messages: [
        { role: 'system', content: 'You are a parking chatbot.' },
        { role: 'user', content: message },
      ],
    });
    this.logger.log(completion.data.choices[0].message);
    return completion.data.choices[0].message;
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
