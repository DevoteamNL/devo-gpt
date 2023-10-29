import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AzureKeyCredential, OpenAIClient } from '@azure/openai';
import { CognitiveSearchService } from '../cognitive-search/cognitive-search.service';
import { JoanDeskService } from '../integrations/joan-desk/joan-desk.service';

@Injectable()
export class OpenaiService {
  private readonly logger = new Logger(OpenaiService.name);
  private readonly openai;
  constructor(
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => CognitiveSearchService))
    private readonly cognitiveSearchService: CognitiveSearchService,
    private readonly joanDeskService: JoanDeskService,
  ) {
    this.openai = new OpenAIClient(
      // 'https://swedencentral.openai.azure.com',
      'https://swedencentral.api.cognitive.microsoft.com/',
      new AzureKeyCredential(
        this.configService.get<string>('AZURE_OPENAI_API_KEY'),
      ),
    );
  }

  async getCurrentWeather(
    location: string,
    unit: string = 'celsius',
  ): Promise<Number> {
    this.logger.log(`Getting current weather for ${location} in ${unit}`);
    // You'll need to sign up for an API key from a weather data provider like OpenWeatherMap
    // const apiKey = 'your-weather-api-key-here';
    // const units = unit === 'celsius' ? 'metric' : 'imperial';
    // const url = `https://api.openweathermap.org/data/2.5/weather?q=${location}&units=${units}&appid=${apiKey}`;
    try {
      // const response = await this.httpService.get(url).toPromise();
      return 22;
    } catch (error) {
      this.logger.error(error);
      throw new Error('Unable to fetch weather data');
    }
  }

  // Get the employees professional work experience details based on a given employee name or certificate name or skill name
  async getEmployeesWorkDetails(
    name: string,
    certificate: string,
    skill: string,
  ): Promise<any> {
    this.logger.log(
      `Getting employees professional work experience details based on a given employee name ${name} or certificate ${certificate} or skill ${skill}`,
    );
    try {
      // const response = await this.httpService.get(url).toPromise();
      return await this.cognitiveSearchService.doSemanticHybridSearch(
        name + certificate + skill,
      );
    } catch (error) {
      this.logger.error(error);
      throw new Error('Unable to fetch employee work experience details');
    }
  }

  // Get the employees professional work experience details based on a given employee name or certificate name or skill name
  async getAvailableDesks(from: string, to: string): Promise<any> {
    this.logger.log(`Get available desks based on ${from} and ${to}`);
    try {
      const listOfAvailableDesks = await this.joanDeskService.getAvailableDesks(
        from,
        to,
      );
      this.logger.log(`#### AVAILABLE DESKS`);
      this.logger.log(listOfAvailableDesks);
      return listOfAvailableDesks;
    } catch (error) {
      this.logger.error(error);
      throw new Error('Unable to fetch employee work experience details');
    }
  }

  async getChatResponse(senderName, message) {
    const getCurrentWeather = {
      name: 'getCurrentWeather',
      description: 'Get the current weather in a given location',
      parameters: {
        type: 'object',
        properties: {
          location: {
            type: 'string',
            description: 'The city and state, e.g. San Francisco, CA',
          },
          unit: {
            type: 'string',
            enum: ['celsius', 'fahrenheit'],
          },
        },
        required: ['location'],
      },
    };

    const getAvailableDesks = {
      name: 'getAvailableDesks',
      description: 'Get available desks based on from and to date and time',
      parameters: {
        type: 'object',
        properties: {
          from: {
            type: 'string',
            description:
              'The Start date ("From") of interested time window in RFC3339 format',
          },
          to: {
            type: 'string',
            description:
              'The Start date ("To") of interested time window in RFC3339 format',
          },
        },
        required: ['from', 'to'],
      },
    };

    const getEmployeesWorkDetails = {
      name: 'getEmployeesWorkDetails',
      description:
        'Get the employees professional work experience details based on a given name or certificate or skill',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'The employee name',
          },
          certificate: {
            type: 'string',
            description: 'The certificate name',
          },
          skill: {
            type: 'string',
            description: 'The skill name',
          },
        },
      },
    };

    try {
      const messages: any[] = [];
      messages.push({
        role: 'system',
        content: `Current Date and Time is ${new Date().toISOString()}.
          You are a AI assistant who helps with ONLY following topics:
          1) Get the current weather in a given location
          2) Get available desks only in Amsterdam office, based on date and time (respond with date/day and full name like "Bar table #6", "Desk #1 - Dual Monitor,Desk #10")
          3) Make desk reservation for Amsterdam office, based on timeslot, morning, afternoon or full/all day (respond with full name like "Bar table #6", "Desk #1 - Dual Monitor,Desk #10")
          4) Get the employees professional work experience details based on a given name or certificate or skill
          if you don't find answer within context, say it do not know the answer.
          If user asks for help other than above two topics, you reply by stating that you can only help with above two topics.
          You can personalize response, use users name or emojis and make it non professional response.
          Keep answer as short as possible, very short please. few statements.
          If user just says Hi or how are you to start conversation, you can respond with greetings and what you can do for them.`,
      });
      messages.push({
        role: 'user',
        content: `My name is ${senderName} \n\n\n` + message,
      });
      const completion = await this.openai.getChatCompletions(
        'gpt-4-32k',
        messages,
        {
          temperature: 0,
          functions: [
            getCurrentWeather,
            getEmployeesWorkDetails,
            getAvailableDesks,
          ],
        },
      );
      const response_message = completion.choices[0].message;
      const functionCall = response_message.functionCall;
      this.logger.log(`FUNCTION_CALLING: ${JSON.stringify(functionCall)}`);
      if (functionCall && functionCall.name === 'getCurrentWeather') {
        const { location, unit } = JSON.parse(functionCall.arguments); // Assuming functionCall.params contains the necessary parameters
        const weatherData = await this.getCurrentWeather(location, unit);
        messages.push({
          role: response_message.role,
          function_call: {
            name: functionCall.name,
            arguments: response_message.functionCall.arguments,
          },
          content: '',
        });
        messages.push({
          role: 'function',
          name: functionCall.name,
          content: weatherData.toString(),
        });
        const completionWeather = await this.openai.getChatCompletions(
          'gpt-4-32k',
          messages,
          { temperature: 0 },
        );
        this.logger.log(completionWeather.choices[0].message);
        return completionWeather.choices[0].message;
      } else if (
        functionCall &&
        functionCall.name === 'getEmployeesWorkDetails'
      ) {
        const { name, certificate, skill } = JSON.parse(functionCall.arguments); // Assuming functionCall.params contains the necessary parameters
        const employeeDetails = await this.getEmployeesWorkDetails(
          name,
          certificate,
          skill,
        );

        messages.push({
          role: response_message.role,
          function_call: {
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
        const completionWeather = await this.openai.getChatCompletions(
          'gpt-4-32k',
          messages,
          { temperature: 0 },
        );
        this.logger.log(completionWeather.choices[0].message);
        return completionWeather.choices[0].message;
      } else if (functionCall && functionCall.name === 'getAvailableDesks') {
        const { from, to } = JSON.parse(functionCall.arguments); // Assuming functionCall.params contains the necessary parameters
        const availableDesks = await this.getAvailableDesks(from, to);

        messages.push({
          role: response_message.role,
          function_call: {
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
            'respond with date/day and full name like "Bar table #6", "Desk #1 - Dual Monitor,Desk #10"',
        });
        this.logger.debug(`########`);
        this.logger.debug(messages);
        const completionAvailableDesks = await this.openai.getChatCompletions(
          'gpt-4-32k',
          messages,
          { temperature: 0 },
        );
        this.logger.log(completionAvailableDesks.choices[0].message);
        return completionAvailableDesks.choices[0].message;
      }

      this.logger.log(completion.choices[0].message);
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
      const response = await this.openai.getEmbeddings(
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
