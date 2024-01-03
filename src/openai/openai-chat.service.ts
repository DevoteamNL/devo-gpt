import { Injectable, Logger } from '@nestjs/common';
import { ChatMessage } from '@azure/openai';
import { MessageService } from '../message/message.service';
import { AzureOpenAIClientService } from './azure-openai-client.service';
import { FunctionDefinition, plugins } from 'src/plugins';
import { ConfigService } from '@nestjs/config';
@Injectable()
export class OpenaiChatService {
  private readonly logger = new Logger(OpenaiChatService.name);
  private readonly gpt35Deployment = 'gpt-35-turbo';
  private readonly gpt4Deployment = 'gpt-4';
  private readonly plugins = [];

  constructor(
    private readonly messageService: MessageService,
    private readonly azureOpenAIClient: AzureOpenAIClientService,
    configService: ConfigService,
  ) {
    this.plugins = Object.values(plugins).map(
      (plugin) => new plugin(configService, this.logger),
    );
  }

  public getFunctionDefinitions(): FunctionDefinition[] {
    return [
      ...this.plugins.flatMap((plugin) => plugin.getFunctionDefinitions()),
    ];
  }

  // Get the employees professional work experience details based on a given employee name or certificate name or skill name

  //system message
  //Query message from user
  //funiton informatin
  async getChatResponse({ senderName, senderEmail, threadId }) {
    const functions: FunctionDefinition[] = this.getFunctionDefinitions();

    // Initialize the message array with existing messages or an empty array
    const chatHistory = await this.messageService.findAllMessagesByThreadId(
      threadId,
    );

    try {
      if (chatHistory.length === 1) {
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
        chatHistory.unshift(systemMessage);
      }
      this.logger.log(`CHAT_HISTORY: ${JSON.stringify(chatHistory)}`);
      const completion = await this.azureOpenAIClient.getChatCompletions(
        this.gpt4Deployment,
        chatHistory,
        {
          temperature: 0.1,
          functions: [...functions],
        },
      );
      const initial_response = completion.choices[0].message;
      await this.messageService.create({
        threadId,
        data: initial_response,
      });
      chatHistory.push(initial_response);
      this.logger.log(
        `INITIAL_RESPONSE: ${JSON.stringify(completion.choices[0].message)}`,
      );
      const functionCall = initial_response.functionCall;
      this.logger.log(`FUNCTION_CALLING: ${JSON.stringify(functionCall)}`);
      if (functionCall && functionCall.name) {
        const function_response = await this.executeFunction(
          functionCall,
          senderEmail,
        )[0];
        const calledFunction = functions.find(
          (f) => f.name === functionCall.name,
        );
        // chatHistory.push({
        //   role: function_response.role,
        //   functionCall: {
        //     name: functionCall.name,
        //     arguments: function_response.functionCall.arguments,
        //   },
        //   content: '',
        // });
        chatHistory.push({
          role: 'function',
          name: functionCall.name,
          content: function_response.toString() + calledFunction.followUpPrompt,
        });
        await this.messageService.create({
          threadId,
          data: {
            role: 'function',
            name: functionCall.name,
            content:
              function_response.toString() + calledFunction.followUpPrompt,
          },
        });
        this.logger.debug(`########`);
        this.logger.debug(chatHistory);
        const final_completion =
          await this.azureOpenAIClient.getChatCompletions(
            calledFunction.followUpModel || this.gpt35Deployment,
            chatHistory,
            { temperature: calledFunction.followUpTemperature || 0 },
          );
        const final_response: ChatMessage = final_completion.choices[0].message;
        this.logger.log(`final_response Response:`);
        this.logger.log(final_response);
        chatHistory.push(final_response);
        await this.messageService.create({
          threadId,
          data: final_response,
        });
        return final_response;
      }
      return initial_response;
    } catch (error) {
      this.logger.log(error);
      throw error;
    }
  }

  public async executeFunction(
    functionCall: any,
    senderEmail: string,
  ): Promise<any> {
    return await Promise.all(
      this.plugins.map((plugin) =>
        plugin.executeFunction(
          functionCall.name,
          functionCall.arguments,
          senderEmail,
        ),
      ),
    );
  }
}
