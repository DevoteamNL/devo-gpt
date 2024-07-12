import axios, { AxiosInstance } from 'axios';
import moment from 'moment-timezone';
import {
  AzureAISearchVectorStore,
  AzureAISearchQueryType,
} from '@langchain/community/vectorstores/azure_aisearch';
import { ConfigService } from '../types';
import { Definition } from '../definition.decorator';
import { Plugin } from '../plugin.decorator';
import { Logger } from '@nestjs/common';
import { CognitiveSearchService } from '../../cognitive-search/cognitive-search.service';
import { OpenAIEmbeddings } from '@langchain/openai';
import { Document } from 'typeorm';
import { rethrow } from '@nestjs/core/helpers/rethrow';

@Plugin({ displayName: 'JuridischloketPublicSite' })
export class JuridischloketPlugin {
  private readonly logger = new Logger(JuridischloketPlugin.name);
  private readonly store = new AzureAISearchVectorStore(
    new OpenAIEmbeddings({
      azureOpenAIApiKey: process.env.OPENAI_API_KEY,
      azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION,
      azureOpenAIApiDeploymentName: 'text-embedding-ada-002',
      azureOpenAIBasePath: `${process.env.AZURE_OPENAI_API_ENDPOINT}/openai/deployments`,
    }),
    {
      indexName: 'juridischloket-demo-full',
      search: {
        type: AzureAISearchQueryType.SemanticHybrid,
      },
    },
  );

  constructor(
    private readonly configService: ConfigService,
    private readonly cognitiveSearchService: CognitiveSearchService,
  ) {}

  @Definition({
    description: `This function has huge knowledge base and can answer variety of questions, Always call this function to get answer. Accepts user message in Dutch langugae so convert any message to dutch first, when this plugin is selected, call it be default to get all kind of answers`,
    parameters: {
      type: 'object',
      properties: {
        userMessageInDutch: {
          type: 'string',
          description:
            'User message or query/question converted to Dutch which will be used for vector similarity search',
        },
        userMessageInOriginalLanguage: {
          type: 'string',
          description: 'User message or query/question in original language',
        },
      },
    },
    followUpPrompt: `
    

Answer must be provided from the above context only. If you find engaging questions or queries, ask for clarification.
From above context, if you can ask follow up question for better clarification, ask for it.
It is recommended to ask follow up questions to help user in detail.
If you don't know the answer, just say that you don't know, don't try to make up an answer.
Always include links and sources.
Answer must be in the same language of the user original message langugae.`,
    followUpTemperature: 0,
    followUpModel: 'gpt-4',
  })
  private async getPublicSiteInformation({
    userMessageInDutch,
    userMessageInOriginalLanguage,
  }: {
    userMessageInDutch: string;
    userMessageInOriginalLanguage: string;
  }): Promise<string> {
    this.logger.log(
      `Getting employees professional work experience details based on : ${userMessageInDutch}`,
    );
    try {
      // const response = await this.httpService.get(url).toPromise();
      const searchResults = await this.store.similaritySearch(
        userMessageInDutch,
        4,
      );

      const formatSearchResults = (results: Document[]): string => {
        return results
          .map((result) => {
            // Convert metadata object to a string
            const metadataValues = Object.values(result.metadata).join('');

            // Combine the metadata and content into the desired format
            return `metadata: ${metadataValues}\ncontent: ${result.pageContent}`;
          })
          .join('\n--------------\n');
      };
      const response =
        searchResults.length > 0
          ? formatSearchResults(searchResults)
          : 'No CONTEXT/Results found';
      return `${response}
       
       userMessageInDutch: ${userMessageInDutch}
       userMessageInOriginalLanguage: ${userMessageInOriginalLanguage}
       `;
    } catch (error) {
      this.logger.error(error);
      throw new Error('Unable to fetch employee work experience details');
    }
  }
}
