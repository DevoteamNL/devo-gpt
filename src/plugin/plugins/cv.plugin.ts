import { ConfigService } from '../types';
import { Plugin } from '../plugin.decorator';
import { Logger } from '@nestjs/common';
import { Definition } from '../definition.decorator';

interface Desk {
  id: string;
  name: string;
  schedule: any[];
}

interface ParkingSpotOptions {
  start?: string;
  end?: string;
  show?: 'available' | 'reserved' | 'All';
  date?: string;
  timeslot?: string;
}

@Plugin({ displayName: 'CVs' })
export class CVsPlugin {
  private readonly logger = new Logger(CVsPlugin.name);

  constructor(private readonly configService: ConfigService) {}

  @Definition({
    description:
      'Get the employees professional work experience details based on a given employee name or certificate name or skill name',
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
      required: ['start_date', 'end_date'],
    },

    followUpPrompt: 'Following is information found in CV\n',
    followUpTemperature: 0.7,
    followUpModel: 'gpt-35-turbo-16k',
  })
  private async getEmployeesWorkDetails({
    name,
    certificate,
    skill,
  }: {
    name: string;
    certificate?: string;
    skill?: string;
  }): Promise<string> {
    try {
      return 'Employee ABC has worked with ING as Kubernetes administrator\n';
    } catch (error) {
      throw new Error(
        'Something went wrong while retrieving desk information, try again later.',
      );
    }
  }
}
