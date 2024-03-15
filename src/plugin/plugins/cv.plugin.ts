import axios, { AxiosInstance } from 'axios';
import moment from 'moment-timezone';
import { ConfigService } from '../types';
import { Definition } from '../definition.decorator';
import { Plugin } from '../plugin.decorator';
import { Logger } from '@nestjs/common';
import { CognitiveSearchService } from '../../cognitive-search/cognitive-search.service';

@Plugin({ displayName: 'CVs' })
export class CVsPlugin {
  private readonly logger = new Logger(CVsPlugin.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly cognitiveSearchService: CognitiveSearchService,
  ) {}

  @Definition({
    description: `Get the employees professional work experience context/details from Vector Database`,
    parameters: {
      type: 'object',
      properties: {
        completeUserMessage: {
          type: 'string',
          description:
            'Complete User message or query/question which will be used for vector similarity search',
        },
      },
    },
    followUpPrompt: `
    

      
Look at user question and look at employee work experience above see if you can find answer from above context, 
if you don't find answer within context, say it do not know the answer.`,
    followUpTemperature: 0.7,
    followUpModel: 'gpt-4',
  })
  private async getEmployeesWorkDetails({
    completeUserMessage,
  }: {
    completeUserMessage: string;
  }): Promise<string> {
    this.logger.log(
      `Getting employees professional work experience details based on : ${completeUserMessage}`,
    );
    try {
      // const response = await this.httpService.get(url).toPromise();
      const searchResults =
        await this.cognitiveSearchService.doSemanticHybridSearch(
          completeUserMessage,
        );
      return searchResults.join('\n');
    } catch (error) {
      this.logger.error(error);
      throw new Error('Unable to fetch employee work experience details');
    }
  }
}
