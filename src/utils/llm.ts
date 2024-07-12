import { AzureChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import { BaseChatModel } from 'langchain/chat_models/base';

// @ts-ignore
export const llm: BaseChatModel = new AzureChatOpenAI({
  openAIApiKey: process.env.AZURE_OPENAI_API_KEY,
  deploymentName: 'gpt-35-turbo',
  openAIApiVersion: process.env.AZURE_OPENAI_API_VERSION,
  temperature: 0,
  openAIBasePath: process.env.AZURE_OPENAI_API_ENDPOINT,
});

export const embeddings = new OpenAIEmbeddings({
  azureOpenAIApiKey: process.env.OPENAI_API_KEY,
  azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION,
  azureOpenAIApiDeploymentName: 'text-embedding-ada-002',
  azureOpenAIBasePath: `${process.env.AZURE_OPENAI_API_ENDPOINT}/openai/deployments`,
});
