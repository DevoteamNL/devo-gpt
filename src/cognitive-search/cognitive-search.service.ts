import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SearchClient, SearchIndexClient } from '@azure/search-documents';
import { AzureKeyCredential } from '@azure/openai';
import { OpenaiService } from '../openai/openai.service';

@Injectable()
export class CognitiveSearchService {
  private readonly logger: Logger = new Logger(CognitiveSearchService.name);
  private readonly searchClient;
  private readonly indexClient: SearchIndexClient;

  /*
   * Constructor
   * @param configService - ConfigService
   * @param openaiService - OpenaiService
   * @returns CognitiveSearchService
   */
  constructor(
    private readonly configService: ConfigService,
    private readonly openaiService: OpenaiService,
  ) {
    const { endpoint, indexName, adminKey } = this.getAzureSearchConfig();
    this.searchClient = new SearchClient(
      endpoint,
      indexName,
      new AzureKeyCredential(adminKey),
      { apiVersion: '2023-07-01-Preview' },
    );
    this.indexClient = new SearchIndexClient(
      endpoint,
      new AzureKeyCredential(adminKey),
      { apiVersion: '2023-07-01-Preview' },
    );
  }

  /*
   * Get Azure Search config from env
   * @returns Azure Search config
   * @throws Error
   */
  private getAzureSearchConfig() {
    return {
      endpoint: this.configService.get<string>('AZURE_SEARCH_ENDPOINT'),
      indexName: this.configService.get<string>('AZURE_SEARCH_INDEX_NAME'),
      adminKey: this.configService.get<string>('AZURE_SEARCH_ADMIN_KEY'),
    };
  }

  /*
   * Upload documents to Azure Cognitive Search index
   * @param docs - Array of documents to upload
   * @returns void
   * @throws Error
   */
  async uploadDocuments(docs): Promise<void> {
    try {
      this.logger.log('Uploading documents to ACS index...');
      await this.searchClient.uploadDocuments(docs);
    } catch (err) {
      this.logger.error('Error uploading documents to ACS index', err.stack);
    }
  }

  // return top 4 results
  /*
   * Do semantic search
   * @param query - Query to search
   * @returns Array of concatenated results
   * @throws Error
   */
  async doSemanticHybridSearch(query: string): Promise<string[]> {
    try {
      this.logger.log(`Searching for: ${query}`);
      const vectorValue = await this.openaiService.generateEmbedding(query);
      // TODO: Fix me, vector search isn't working as expected
      const response = await this.searchClient.search(query, {
        vector: {
          value: vectorValue,
          kNearestNeighborsCount: 4,
          fields: ['contentVector'],
        },
        select: ['title', 'content'],
        top: 4,
      });

      const concatenatedResults: string[] = [];
      for await (const result of response.results) {
        this.logger.log(`Title: ${result.document.title}`);
        // this.logger.debug(`Content: ${result.document.content}`);
        const employeeData = `

Employee CV File Name: ${result.document.title}
Employee CV File Content START:
${result.document.content.replace(/[\n\r]+/g, '\n')}
          
          
          
          
          
Employee CV File Content END
============================================================
          
          
`;
        // this.logger.debug(employeeData);
        concatenatedResults.push(employeeData);
      }

      return concatenatedResults;
    } catch (err) {
      this.logger.error('Error during semantic hybrid search', err.stack);
      return [];
    }
  }

  /*
   * Get documents by file ids
   * @param fileIds - Array of file ids
   * @returns Array of fileids found in search
   * @throws Error
   */
  async getDocumentsByFileIds(fileIds: string[]): Promise<any> {
    try {
      if (!fileIds.length) {
        return [];
      }
      this.logger.log(`Searching for file ids: ${fileIds.join(', ')}`);
      const response = await this.searchClient.search(
        `fileId:(${fileIds.join(' OR ')})`,
        {
          select: ['fileId'],
        },
      );

      const foundFileIds = [];
      for await (const result of response.results) {
        foundFileIds.push(result.document.fileId);
      }

      this.logger.log(`Found file ids: ${foundFileIds.join(', ')}`);

      return foundFileIds;
    } catch (err) {
      this.logger.error('Error during getDocumentByFileId', err.stack);
      return [];
    }
  }
}

// TODO: Fix me, seems SDK is broken
// async createIndex() {
//   const result = await this.indexClient.createIndex({
//     name: 'cv-index',
//     fields: [
//       {
//         type: 'Edm.String',
//         name: 'fileId',
//         key: true,
//         filterable: true,
//       },
//       {
//         type: 'Edm.String',
//         name: 'title',
//         searchable: true,
//       },
//       {
//         type: 'Edm.String',
//         name: 'content',
//         searchable: true,
//         filterable: true,
//         facetable: false,
//       },
//       {
//         name: 'contentVector',
//         type: 'Collection(Edm.Single)',
//         dimensions: 1536,
//         vectorSearchConfiguration: 'cv-vector-config',
//         searchable: true,
//         retrievable: true,
//       },
//     ],
//     vectorSearch: {
//       algorithmConfigurations: [
//         {
//           name: 'cv-vector-config',
//           kind: 'hnsw',
//           hnswParameters: {
//             m: 4,
//             efConstruction: 400,
//             efSearch: 500,
//             metric: 'cosine',
//           },
//         },
//       ],
//     },
//     semantic: {
//       configurations: [
//         {
//           name: 'cv-semantic-config',
//           prioritizedFields: {
//             titleField: {
//               fieldName: 'title',
//             },
//             prioritizedContentFields: [
//               {
//                 fieldName: 'content',
//               },
//             ],
//           },
//         },
//       ],
//     },
//   });
//   this.logger.log('Index created');
//   this.logger.log(result);
// }
