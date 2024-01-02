import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatMessage } from '@azure/openai';
import { BufferMemoryService } from '../utils/buffer-memory/buffer-memory.service';
import { AzureOpenAIClientService } from './azure-openai-client.service';
import { plugins, Plugin, FunctionDefinition } from 'src/plugins';

@Injectable()
export class OpenaiService {
  private readonly logger = new Logger(OpenaiService.name);
  private readonly plugins: Plugin[] = [];

  constructor(
    private readonly bufferMemoryService: BufferMemoryService,
    private readonly azureOpenAIClient: AzureOpenAIClientService,
    readonly configService: ConfigService,
  ) {
    Object.values(plugins).forEach((plugin) => {
      this.plugins.push(new plugin(configService, this.logger));
    });
  }

  async getChatResponse(
    senderName: string,
    senderEmail: string,
    message: string,
  ) {
    const functions: FunctionDefinition[] = [
      ...this.plugins.flatMap((plugin) => plugin.getFunctionDefinitions()),
      ...this.bufferMemoryService.getFunctionDefinitions(),
    ];

    // Initialize the message array with existing messages or an empty array
    const messages: ChatMessage[] =
      this.bufferMemoryService.getMessages(senderEmail);

    try {
      if (messages.length === 0) {
        // Initialize chat session with System message
        // Generic prompt engineering
        const systemMessage: ChatMessage = {
          role: 'system',
          content: `Current Date and Time is ${new Date().toISOString()}.
User's name is ${senderName} and user's emailID is ${senderEmail}.
 
You are a AI assistant who helps with ONLY topics that you can find in function callings.

If you are not sure about question ask for clarification or say you do not know the answer.

if you don't find answer within context, say it do not know the answer.
If user asks for help other than what function callings are for, then you cannot help them, and say what you can help with.

You can personalize response, use users name or emojis and make it little less professional response and make it fun.
But remember you are still in professional environment, so don't get too personal.
Keep answer as short as possible, very short please. few statements or even single if you can do it.
If user just says Hi or how are you to start conversation, you can respond with greetings and what you can do for them.`,
        };
        messages.push(systemMessage);
      }
      // Add the new user message to the buffer
      const userMessage: ChatMessage = {
        role: 'user',
        content: message,
      };
      messages.push(userMessage);

      const completion = await this.azureOpenAIClient.getChatCompletions(
        'gpt-4',
        messages,
        {
          temperature: 0.1,
          functions: [...functions],
        },
      );
      const response_message = completion.choices[0].message;
      const functionCall = response_message.functionCall;
      this.logger.log(
        `INITIAL_RESPONSE: ${JSON.stringify(completion.choices[0].message)}`,
      );
      this.logger.log(`FUNCTION_CALLING: ${JSON.stringify(functionCall)}`);

      if (functionCall) {
        if (functionCall.name === 'getEmployeesWorkDetails') {
          return {
            content:
              'This feature is not available in this version of the AI assistant.',
          };
        } else if (functionCall.name === 'clearChatHistory') {
          this.bufferMemoryService.deleteBufferEntry(senderEmail);
          return {
            content:
              'Chat History has been deleted. New Session will start with your next message. All Previous chat history will be ignored.',
          };
        }
        const calledFunction = functions.find(
          (f) => f.name === functionCall.name,
        );

        try {
          const response = await Promise.all(
            this.plugins.map((plugin) =>
              plugin.executeFunction(
                functionCall.name,
                functionCall.arguments,
                senderEmail,
              ),
            ),
          );

          messages.push({
            role: response_message.role,
            functionCall: response_message.functionCall,
            content: '',
          });
          messages.push({
            role: 'function',
            name: functionCall.name,
            content: calledFunction.followUpPrompt + response,
          });
          this.logger.debug(`########`);
          this.logger.debug(messages);
          const completion = await this.azureOpenAIClient.getChatCompletions(
            calledFunction.followUpModel || 'gpt-35-turbo',
            messages,
            { temperature: calledFunction.followUpTemperature || 0 },
          );
          this.logger.log(`completion Response:`);
          this.logger.log(completion.choices[0].message);
          messages.push(completion.choices[0].message);
          const onlyNewMessages = messages.slice(
            this.bufferMemoryService.getMessages(senderEmail).length,
          );
          this.bufferMemoryService.addMessages(senderEmail, onlyNewMessages);
          if (calledFunction.clearAfterExecution) {
            this.bufferMemoryService.deleteBufferEntry(senderEmail);
          }
          return completion.choices[0].message;
        } catch (e) {
          return {
            content: e.message,
          };
        }
      }

      this.logger.log(completion.choices[0].message);
      messages.push(completion.choices[0].message);
      const onlyNewMessages = messages.slice(
        this.bufferMemoryService.getMessages(senderEmail).length,
      );
      this.bufferMemoryService.addMessages(senderEmail, onlyNewMessages);
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
      const response = await this.azureOpenAIClient.getEmbeddings(
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
