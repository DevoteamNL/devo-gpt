import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Configuration, OpenAIApi } from 'openai';

@Injectable()
export class OpenaiService {
  private readonly logger = new Logger(OpenaiService.name);
  private readonly openai;
  constructor(private readonly configService: ConfigService) {
    const configuration = new Configuration({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
    this.openai = new OpenAIApi(configuration);
  }

  async getChatResponse(message) {
    const completion = await this.openai.createChatCompletion({
      model: 'gpt-4',
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
}
