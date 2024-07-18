import { Injectable, Logger } from '@nestjs/common';
import {
  ChatResponseMessage,
  ChatRequestFunctionMessage,
  EventStream,
  ChatCompletions,
} from '@azure/openai';
import { MessageService } from '../message/message.service';
import { AzureOpenAIClientService } from './azure-openai-client.service';
import { PluginService } from '../plugin';
import { ServerResponse } from 'http';
import { OpenAIModel } from '../config/constants';

export enum MetadataTagName {
  USER_MESSAGE_ID = 'userMessageId',
  USER_MESSAGE_CREATED_AT = 'userMessageCreatedAt',
  THREAD_ID = 'threadId',
  ROLE = 'role',
  AI_MESSAGE_ID = 'aiMessageId',
  AI_MESSAGE_CREATED_AT = 'aiMessageCreatedAt',
}

interface MetadataContent {
  data: string;
  metadataTag: MetadataTagName;
}

/**
 * Writes a sequence of metadata to the server response stream
 * @param writableStream server response
 * @param dataForChunks metadata to be written
 */
const writeMetadataToStream = (
  writableStream: ServerResponse,
  dataForChunks: MetadataContent[],
) => {
  for (const dataObj of dataForChunks) {
    writableStream.write(`[[${dataObj.metadataTag}=${dataObj.data}]]`);
  }
};

@Injectable()
export class OpenaiChatService {
  private readonly logger = new Logger(OpenaiChatService.name);

  constructor(
    private readonly messageService: MessageService,
    private readonly azureOpenAIClient: AzureOpenAIClientService,
    private readonly pluginService: PluginService,
  ) {}

  /**
   * Sets and returns what the AI chat responded to the user request
   * @param param0
   */
  async getChatResponseStream({
    senderName,
    senderEmail,
    threadId,
    plugin,
    writableStream,
    userMessageId,
    userMessageCreatedAt,
  }: {
    senderName: string;
    senderEmail: string;
    threadId: number;
    plugin?: string;
    writableStream: ServerResponse;
    userMessageId: number;
    userMessageCreatedAt: string;
  }) {
    // Initialize the message array with existing messages or an empty array
    const chatHistory: Array<ChatRequestFunctionMessage | ChatResponseMessage> =
      await this.messageService.findAllMessagesByThreadId(threadId);

    try {
      // Initialize chat session with System message
      // Generic prompt engineering
      const systemMessage: ChatResponseMessage = {
        role: 'system',
        content: `Current Date and Time is ${new Date().toISOString()}.
User's name is ${senderName} and user's emailID is ${senderEmail}.
 
You are a AI assistant who helps with ONLY topics that you can find in Plugins/Functions.

If you are not sure about question ask for clarification or say you do not know the answer.

if you don't find answer within context, say it do not know the answer.
If user asks for help other than what function callings are for, then you cannot help them, and say what you can help with.

You can personalize response, use users name or emojis and make it little less professional response and make it fun.
But remember you are still in professional environment, so don't get too personal.
Keep answer as short as possible, very short please. few statements or even single if you can do it.
If user just says Hi or how are you to start conversation, you can respond with greetings and what you can do for them.`,
      };
      chatHistory.unshift(systemMessage);
      this.logger.log(`CHAT_HISTORY: ${JSON.stringify(chatHistory)}`);

      const completion = await this.azureOpenAIClient.getChatCompletions(
        OpenAIModel.gpt4_32K_Deployment,
        chatHistory,
        {
          temperature: 0.1,
          functions: this.pluginService.functionDefinitions.filter(
            (f) => !plugin || f.name.startsWith(plugin + '-'),
          ),
        },
      );
      const initialResponse = completion.choices[0].message;
      const initialResponseMessagePromise = this.messageService.create({
        threadId,
        data: initialResponse,
      });

      chatHistory.push(initialResponse);
      this.logger.log(
        `INITIAL_RESPONSE: ${JSON.stringify(completion.choices[0].message)}`,
      );

      const { functionCall } = initialResponse;
      this.logger.log(`FUNCTION_CALLING: ${JSON.stringify(functionCall)}`);

      writeMetadataToStream(writableStream, [
        {
          data: threadId.toString(),
          metadataTag: MetadataTagName.THREAD_ID,
        },
        {
          data: userMessageId.toString(),
          metadataTag: MetadataTagName.USER_MESSAGE_ID,
        },
        {
          data: new Date(userMessageCreatedAt).toISOString(),
          metadataTag: MetadataTagName.USER_MESSAGE_CREATED_AT,
        },
      ]);
      writableStream.emit('drain');

      if (functionCall && functionCall.name) {
        const functionResponse = await this.pluginService.executeFunction(
          functionCall.name,
          functionCall.arguments,
          senderEmail,
        );
        const calledFunction = this.pluginService.findDefinition(
          functionCall.name,
        );
        const creationPromise = this.messageService.create({
          threadId,
          data: {
            role: 'function',
            name: functionCall.name,
            content:
              functionResponse.toString() + calledFunction.followUpPrompt,
          },
        });
        chatHistory.push({
          role: 'function',
          name: functionCall.name,
          content: functionResponse.toString() + calledFunction.followUpPrompt,
        });

        this.logger.debug(`########`);
        this.logger.debug(chatHistory);

        const finalCompletionEventStream: EventStream<ChatCompletions> =
          await this.azureOpenAIClient.streamChatCompletions(
            calledFunction.followUpModel || OpenAIModel.gpt4_32K_Deployment,
            chatHistory,
            { temperature: calledFunction.followUpTemperature || 0 },
          );

        const NO_CONTENT = '';
        const responseMessage: ChatResponseMessage = {
          content: NO_CONTENT,
          role: NO_CONTENT,
        };

        for await (const event of finalCompletionEventStream) {
          for (let i = 0; i < event.choices.length; i++) {
            if (event.choices[i].delta) {
              if (
                event.choices[i].delta.role &&
                responseMessage.role === NO_CONTENT
              ) {
                writeMetadataToStream(writableStream, [
                  {
                    data: event.choices[i].delta.role,
                    metadataTag: MetadataTagName.ROLE,
                  },
                ]);
                responseMessage.role = event.choices[i].delta.role;
              }
              if (event.choices[i].delta.content) {
                writableStream.write(event.choices[i].delta.content);
                responseMessage.content += event.choices[i].delta.content;
              }
              if (i % 2 === 0) {
                writableStream.emit('drain');
              }
            }
          }
        }
        this.logger.log(responseMessage);
        // chatHistory.push(responseMessage);

        await creationPromise;
        const createdMessage = await this.messageService.create({
          threadId,
          data: responseMessage,
        });
        writeMetadataToStream(writableStream, [
          {
            data: createdMessage.id.toString(),
            metadataTag: MetadataTagName.AI_MESSAGE_ID,
          },
          {
            data: new Date(createdMessage.createdAt).toISOString(),
            metadataTag: MetadataTagName.AI_MESSAGE_CREATED_AT,
          },
        ]);
      } else {
        this.logger.log('No functionCall');

        const initialResponseMessage = await initialResponseMessagePromise;
        writeMetadataToStream(writableStream, [
          {
            data: initialResponseMessage.data.role,
            metadataTag: MetadataTagName.ROLE,
          },
        ]);
        writableStream.write(initialResponseMessage.data.content);
        writeMetadataToStream(writableStream, [
          {
            data: initialResponseMessage.id.toString(),
            metadataTag: MetadataTagName.AI_MESSAGE_ID,
          },
          {
            data: new Date(initialResponseMessage.createdAt).toISOString(),
            metadataTag: MetadataTagName.AI_MESSAGE_CREATED_AT,
          },
        ]);
      }
      writableStream.end();
    } catch (error) {
      this.logger.log(error);
      throw error;
    }
  }
}
