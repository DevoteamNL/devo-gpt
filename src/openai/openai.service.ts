import { Injectable, Logger } from '@nestjs/common';
import {
  ChatCompletions,
  ChatResponseMessage,
  ChatRequestFunctionMessage,
  Completions,
  FunctionDefinition,
} from '@azure/openai';
import { JoanDeskService } from '../integrations/joan-desk/joan-desk.service';
import { EmployeesService } from '../employees/employees.service';
import { BufferMemoryService } from '../utils/buffer-memory/buffer-memory.service';
import { AzureOpenAIClientService } from './azure-openai-client.service';

@Injectable()
export class OpenaiService {
  private readonly logger = new Logger(OpenaiService.name);
  private readonly gpt35t16kDeployment = 'gpt-35-turbo-16k';
  private readonly gpt35Deployment = 'gpt-35-turbo';
  private readonly gpt4Deployment = 'gpt-4';
  private readonly gpt432kDeployment = 'gpt-4-32k';

  constructor(
    private readonly joanDeskService: JoanDeskService,
    private readonly bufferMemoryService: BufferMemoryService,
    private readonly azureOpenAIClient: AzureOpenAIClientService,
  ) {}

  // Get the employees professional work experience details based on a given employee name or certificate name or skill name

  //system message
  //Query message from user
  //funiton informatin
  async getChatResponse(senderName, senderEmail, message) {
    const functions: FunctionDefinition[] = [
      ...this.joanDeskService.getFunctionDefinitions(),
      //...this.employeesService.getFunctionDefinitions(),
      ...this.bufferMemoryService.getFunctionDefinitions(),
      // ... other service function definitions
    ];

    // Initialize the message array with existing messages or an empty array
    const messages: Array<ChatRequestFunctionMessage | ChatResponseMessage> =
      this.bufferMemoryService.getMessages(senderEmail);

    try {
      if (messages.length === 0) {
        // Initialize chat session with System message
        // Generic prompt engineering
        const systemMessage: ChatResponseMessage = {
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
      const userMessage: ChatResponseMessage = {
        role: 'user',
        content: message,
      };
      messages.push(userMessage);

      const completion = await this.azureOpenAIClient.getChatCompletions(
        this.gpt4Deployment,
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
      if (functionCall && functionCall.name === 'getEmployeesWorkDetails') {
        return {
          content:
            'This feature is not available in this version of the AI assistant.',
        };
        /* const { name, certificate, skill } = JSON.parse(functionCall.arguments); // Assuming functionCall.params contains the necessary parameters
        this.logger.log(
          `getEmployeesWorkDetails: ${name}, ${certificate}, ${skill}`,
        );
        const employeeDetails =
          await this.employeesService.getEmployeesWorkDetails(
            name,
            certificate,
            skill,
          );

        messages.push({
          role: response_message.role,
          functionCall: {
            name: functionCall.name,
            arguments: response_message.functionCall.arguments,
          },
          content: '',
        });
        messages.push({
          role: 'function',
          name: functionCall.name,
          content: employeeDetails.toString(),
        });
        this.logger.debug(`########`);
        this.logger.debug(messages);
        const completionEmployeesWorkDetails =
          await this.azureOpenAIClient.getChatCompletions(
            this.gpt432kDeployment,
            messages,
            {
              temperature: 0,
            },
          );
        this.logger.log(`completionEmployeesWorkDetails Response:`);
        this.logger.log(completionEmployeesWorkDetails.choices[0].message);
        messages.push(completionEmployeesWorkDetails.choices[0].message);
        // const onlyNewMessages = messages.slice(
        //   this.bufferMemoryService.getMessages(senderEmail).length,
        // );
        this.bufferMemoryService.addMessages(senderEmail, [
          completionEmployeesWorkDetails.choices[0].message,
        ]);
        return completionEmployeesWorkDetails.choices[0].message;*/
      } else if (functionCall && functionCall.name === 'postDeskReservation') {
        const { deskName, date, timeslot } = JSON.parse(functionCall.arguments); // Assuming functionCall.params contains the necessary parameters
        const reservationDesksResponse =
          await this.joanDeskService.postDeskReservation(
            senderEmail,
            deskName,
            date,
            timeslot,
          );

        messages.push({
          role: response_message.role,
          functionCall: {
            name: functionCall.name,
            arguments: response_message.functionCall.arguments,
          },
          content: '',
        });
        messages.push({
          role: 'function',
          name: functionCall.name,
          content:
            reservationDesksResponse.toString() +
            '\n\n\n' +
            'Respond with calculated date and day and full name like "Bar table #6", "Desk #1 - Dual Monitor"',
        });
        this.logger.debug(`########`);
        this.logger.debug(messages);
        const completionReservationDesks =
          await this.azureOpenAIClient.getChatCompletions(
            this.gpt35Deployment,
            messages,
            { temperature: 0 },
          );
        this.logger.log(`completionReservationDesks Response:`);
        this.logger.log(completionReservationDesks.choices[0].message);
        messages.push(completionReservationDesks.choices[0].message);
        const onlyNewMessages = messages.slice(
          this.bufferMemoryService.getMessages(senderEmail).length,
        );
        this.bufferMemoryService.addMessages(senderEmail, onlyNewMessages);
        return completionReservationDesks.choices[0].message;
      } else if (functionCall && functionCall.name === 'getAvailableDesks') {
        const { from, to } = JSON.parse(functionCall.arguments); // Assuming functionCall.params contains the necessary parameters
        try {
          const availableDesks = await this.joanDeskService.getAvailableDesks(
            from,
            to,
          );

          messages.push({
            role: response_message.role,
            functionCall: {
              name: functionCall.name,
              arguments: response_message.functionCall.arguments,
            },
            content: '',
          });
          messages.push({
            role: 'function',
            name: functionCall.name,
            content:
              availableDesks.toString() +
              '\n\n\n' +
              'Respond with calculated date and day and concise/short answer as possible with desk names, Such as available desk are "High table #3", "From High table #6 to High table #13" ',
          });
          this.logger.debug(`########`);
          this.logger.debug(messages);
          const completionAvailableDesks =
            await this.azureOpenAIClient.getChatCompletions(
              this.gpt35Deployment,
              messages,
              { temperature: 0 },
            );
          this.logger.log(`completionAvailableDesks Response:`);
          this.logger.log(completionAvailableDesks.choices[0].message);
          messages.push(completionAvailableDesks.choices[0].message);
          const onlyNewMessages = messages.slice(
            this.bufferMemoryService.getMessages(senderEmail).length,
          );
          this.bufferMemoryService.addMessages(senderEmail, onlyNewMessages);
          return completionAvailableDesks.choices[0].message;
        } catch (e) {
          return {
            content: 'Could not retrieve available desks.',
          };
        }
      } else if (functionCall && functionCall.name === 'clearChatHistory') {
        this.bufferMemoryService.deleteBufferEntry(senderEmail);
        return {
          content:
            'Chat History has been deleted. New Session will start with your next message. All Previous chat history will be ignored.',
        };
      } else if (
        functionCall &&
        functionCall.name === 'postParkingReservationHandler'
      ) {
        this.logger.log(`postParkingReservationHandler`);
        this.logger.log(functionCall.arguments);
        let parkingReservationResponse: string;
        try {
          const { date, timeslot } = JSON.parse(functionCall.arguments); // Assuming functionCall.params contains the necessary parameters

          parkingReservationResponse =
            await this.joanDeskService.postParkingReservation(
              senderEmail,
              date,
              timeslot,
            );
        } catch (e) {
          parkingReservationResponse =
            'Could not make parking reservation. Something went wrong.';
        }
        messages.push({
          role: response_message.role,
          functionCall: {
            name: functionCall.name,
            arguments: response_message.functionCall.arguments,
          },
          content: '',
        });
        messages.push({
          role: 'function',
          name: functionCall.name,
          content:
            JSON.stringify(parkingReservationResponse) +
            '\n\n\n' +
            'Respond based on user message like parking spot summary, availability, or parking reservation details ' +
            'and also included calculated date and day in response' +
            'Example query can be: do I have parking reservation for tomorrow?, give me names of people who has reservation for tomorrow\n\n\n' +
            'You may ask follow up question if user wants to reserve desk also',
        });
        this.logger.debug(`########`);
        this.logger.debug(messages);
        const completionParkingReservation =
          await this.azureOpenAIClient.getChatCompletions(
            this.gpt35Deployment,
            messages,
            {
              temperature: 0.3,
            },
          );
        this.logger.log(`completionParkingReservation Response:`);
        this.logger.log(completionParkingReservation.choices[0].message);
        messages.push(completionParkingReservation.choices[0].message);
        const onlyNewMessages = messages.slice(
          this.bufferMemoryService.getMessages(senderEmail).length,
        );
        this.bufferMemoryService.addMessages(senderEmail, onlyNewMessages);
        return completionParkingReservation.choices[0].message;
      } else if (
        functionCall &&
        functionCall.name === 'getParkingAvailabilityHandler'
      ) {
        this.logger.log(`getParkingAvailabilityHandler`);
        this.logger.log(functionCall.arguments);
        try {
          const { date, timeslot } = JSON.parse(functionCall.arguments); // Assuming functionCall.params contains the necessary parameters
          const parkingReservationResponse =
            await this.joanDeskService.getAvailableParkingSpots({
              date,
              timeslot,
            });

          messages.push({
            role: response_message.role,
            functionCall: {
              name: functionCall.name,
              arguments: response_message.functionCall.arguments,
            },
            content: '',
          });
          messages.push({
            role: 'function',
            name: functionCall.name,
            content:
              'Below information is parking reservation details in CSV format' +
              '\n If use asked if he has parking? you can check above data to see if user has any reservations' +
              '\n User can also ask who has parking reservations? then you can provide him details of each user and their parking number' +
              'Try to include calculated date and day name in response.' +
              '\n\n\n' +
              'Garage Name and Number,Reservation Status (Reserved/Available),Employee Name(Reserved By)\n' +
              parkingReservationResponse.toString(),
          });
          this.logger.debug(`########`);
          this.logger.debug(messages);
          const completionParkingAvailability =
            await this.azureOpenAIClient.getChatCompletions(
              this.gpt35t16kDeployment,
              messages,
              { temperature: 0.3 },
            );
          this.logger.log(`completionParkingAvailability Response:`);
          this.logger.log(completionParkingAvailability.choices[0].message);
          messages.push(completionParkingAvailability.choices[0].message);
          const onlyNewMessages = messages.slice(
            this.bufferMemoryService.getMessages(senderEmail).length,
          );
          this.bufferMemoryService.addMessages(senderEmail, onlyNewMessages);
          return completionParkingAvailability.choices[0].message;
        } catch (e) {
          this.logger.log(e);
          return {
            content:
              'Something went wrong while retrieving parking information, try again later.',
          };
        }
      } else if (
        functionCall &&
        functionCall.name === 'getDeskReservationsHandler'
      ) {
        this.logger.log(`getDeskReservationsHandler`);
        this.logger.log(functionCall.arguments);
        try {
          const {
            start_date,
            end_date,
            start_time = '06:00',
            end_time = '18:00',
          } = JSON.parse(functionCall.arguments);

          const deskReservationResponse =
            await this.joanDeskService.getDeskReservations(
              start_date,
              end_date,
              start_time,
              end_time,
            );

          messages.push({
            role: response_message.role,
            functionCall: {
              name: functionCall.name,
              arguments: response_message.functionCall.arguments,
            },
            content: '',
          });
          messages.push({
            role: 'function',
            name: functionCall.name,
            content:
              'Below information is in CSV format, It is desk reservation details by all employee.' +
              '\nIf there is desk reservation by a user, that means that user is going to come to office that day.' +
              // '\n\n If use asked if he has desk reservation? you can check above data to see if user has any reservations' +
              // '\n\n User can also ask who has desk reservations? then you can provide him details of each user and their desk name' +
              '\nTry to include calculated date and day name in response, and keep answer as concise as possible, as short as possible.' +
              '\n\n\n' +
              'Desk Name,Reservation Start,Reservation end,Employee Name(Reserved By),Employee Email\n' +
              deskReservationResponse.toString(),
          });
          this.logger.debug(`########`);
          this.logger.debug(messages);
          const completionDeskReservations =
            await this.azureOpenAIClient.getChatCompletions(
              this.gpt35t16kDeployment,
              messages,
              { temperature: 0.7 },
            );
          this.logger.log(`completionDeskReservations Response:`);
          this.logger.log(completionDeskReservations.choices[0].message);
          messages.push(completionDeskReservations.choices[0].message);
          const onlyNewMessages = messages.slice(
            this.bufferMemoryService.getMessages(senderEmail).length,
          );
          this.bufferMemoryService.addMessages(senderEmail, onlyNewMessages);
          return completionDeskReservations.choices[0].message;
        } catch (e) {
          this.logger.log(e);
          return {
            content:
              'Something went wrong while retrieving desk information, try again later.',
          };
        }
      }

      //getDeskReservationsHandler

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

  // Call OpenAI's Chat completions for string
  async getChatCompletions(
    messages: ChatResponseMessage[],
    options: { temperature: number },
  ): Promise<ChatCompletions> {
    return this.azureOpenAIClient.getChatCompletions(
      this.gpt4Deployment,
      messages,
      options,
    );
  }
}
