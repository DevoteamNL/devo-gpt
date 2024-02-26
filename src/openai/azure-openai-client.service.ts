// openai-client.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AzureKeyCredential, OpenAIClient } from '@azure/openai';

@Injectable()
export class AzureOpenAIClientService extends OpenAIClient {
  constructor(private configService: ConfigService) {
    const apiKey = configService.get<string>('AZURE_OPENAI_API_KEY');
    const endpoint = 'https://inficonnect-dvtbrainoai.openai.azure.com/';

    super(endpoint, new AzureKeyCredential(apiKey));
  }
}
