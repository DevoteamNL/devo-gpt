import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AzureKeyCredential,
  ChatMessage,
  FunctionDefinition,
  OpenAIClient,
} from '@azure/openai';
import { JoanDeskService } from '../integrations/joan-desk/joan-desk.service';
import { EmployeesService } from '../employees/employees.service';
import { BufferMemoryService } from '../utils/buffer-memory/buffer-memory.service';
import { MessageService } from '../message/message.service';
import { AzureOpenAIClientService } from './azure-openai-client.service';
import { OpenaiService } from './openai.service';

@Injectable()
export class OpenaiChatService {
  private readonly logger = new Logger(OpenaiChatService.name);
  private readonly gpt35t16kDeployment = 'gpt-35-turbo-16k';
  private readonly gpt35Deployment = 'gpt-35-turbo';
  private readonly gpt4Deployment = 'gpt-4';
  private readonly gpt432kDeployment = 'gpt-4-32k';

  constructor(
    private readonly configService: ConfigService,
    private readonly joanDeskService: JoanDeskService,
    @Inject(forwardRef(() => EmployeesService))
    private readonly employeesService: EmployeesService,
    private readonly bufferMemoryService: BufferMemoryService,
    private readonly messageService: MessageService,
    private readonly azureOpenAIClient: AzureOpenAIClientService,
    private readonly openaiService: OpenaiService,
  ) {}

  // Get the employees professional work experience details based on a given employee name or certificate name or skill name

  //system message
  //Query message from user
  //funiton informatin
  async getChatResponse({ senderName, senderEmail, thread }) {
    const functions: FunctionDefinition[] = [
      ...this.joanDeskService.getFunctionDefinitions(),
      //...this.employeesService.getFunctionDefinitions(),
      ...this.bufferMemoryService.getFunctionDefinitions(),
      // ... other service function definitions
    ];

    // Initialize the message array with existing messages or an empty array
    const chatHistory = await this.messageService.findAllMessagesByThreadId(
      thread.id,
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
      const response_message = completion.choices[0].message;
      await this.messageService.create({
        threadId: thread.id,
        data: response_message,
      });
      chatHistory.push(response_message);
      const functionCall = response_message.functionCall;
      this.logger.log(
        `INITIAL_RESPONSE: ${JSON.stringify(completion.choices[0].message)}`,
      );
      this.logger.log(`FUNCTION_CALLING: ${JSON.stringify(functionCall)}`);

      return response_message;
    } catch (error) {
      this.logger.log(error);
      throw error;
    }
  }
}
