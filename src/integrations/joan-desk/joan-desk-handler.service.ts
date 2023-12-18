import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { ConfigService } from '@nestjs/config';
import { FunctionCall, FunctionDefinition } from '@azure/openai';
import moment from 'moment-timezone';
import { JoanDeskService } from './joan-desk.service';

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

@Injectable()
export class JoanDeskHandlerService {
  private readonly logger = new Logger(JoanDeskHandlerService.name);

  constructor(private readonly joanDeskService: JoanDeskService) {}

  private async getAvailableDesksHandler(functionCall: FunctionCall) {
    const { from, to } = JSON.parse(functionCall.arguments); // Assuming functionCall.params contains the necessary parameters
    try {
      const availableDesks = await this.joanDeskService.getAvailableDesks(
        from,
        to,
      );
      return (
        availableDesks.toString() +
        '\n\n\n' +
        'Respond with calculated date and day and concise/short answer as possible with desk names, Such as available desk are "High table #3", "From High table #6 to High table #13" '
      );
    } catch (e) {
      return {
        content: 'Could not retrieve available desks.',
      };
    }
  }

  private async postDeskReservationHandler(functionCall: FunctionCall) {
    const { deskName, date, timeslot, userEmail } = JSON.parse(
      functionCall.arguments,
    );
    try {
      const reservationDesksResponse =
        await this.joanDeskService.postDeskReservation(
          userEmail,
          deskName,
          date,
          timeslot,
        );
      return (
        reservationDesksResponse.toString() +
        '\n\n\n' +
        'Respond with calculated date and day and full name like "Bar table #6", "Desk #1 - Dual Monitor"'
      );
    } catch (e) {
      return {
        content: 'Could not retrieve available desks.',
      };
    }
  }

  public getFunctionDefinitions() {
    return [
      this.getAvailableDesksHandlerFD(),
      this.postDeskReservationHandlerFD(),
      // this.postParkingReservationHandlerFD(),
      // this.getParkingAvailabilityHandlerFD(),
      // this.getDeskReservationsHandlerFD(),
    ];
  }

  private getAvailableDesksHandlerFD(): FunctionDefinition {
    return {
      name: 'getAvailableDesksHandler',
      description:
        'Get available desks based on from and to date and time, Default from time is 8:00 AM and to time is 5:00 PM',
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
  }

  // Make desk reservation for Amsterdam office, based on desk name and date timeslot (Morning, Afternoon or full/all day)
  private postDeskReservationHandlerFD() {
    return {
      name: 'postDeskReservationHandler',
      description:
        'Make desk reservation/booking for Amsterdam office, based on userEmail, desk name and date timeslot (Morning, Afternoon or All day)',
      parameters: {
        type: 'object',
        properties: {
          userEmail: {
            type: 'string',
            description:
              'The email id of the user who is making reservation, sending message to bot',
          },
          deskName: {
            type: 'string',
            description:
              'Desk name, expected values are From "High table #1" to "High table #13",\n' +
              'From "Single Monitor - Desk #1" to "Single Monitor - Desk #9",\n' +
              'From "Desk #1 - Dual Monitor" to "Desk #24 - Dual Monitor",\n' +
              'From "Bar table #1" to "Bar table #6",\n' +
              'From "Lounge #1" to "Lounge #3",\n' +
              'From "Round table #1" to "Round table #3",',
          },
          date: {
            type: 'string',
            description: 'The date in "YYYY-MM-DD" format',
          },
          timeslot: {
            type: 'string',
            description:
              'Expected values: "Morning", "Afternoon" or "All day". default is All day',
          },
        },
        required: ['deskName', 'date', 'timeslot'],
      },
    };
  }

  private postParkingReservationHandlerFD() {
    return {
      name: 'postParkingReservationHandler',
      description:
        'Make parking/parking spot reservation/booking for Amsterdam office, based on date and timeslot (Morning, Afternoon or All day)',
      parameters: {
        type: 'object',
        properties: {
          userEmail: {
            type: 'string',
            description:
              'The email id of the user who is making reservation, sending message to bot',
          },
          date: {
            type: 'string',
            description: 'The date in "YYYY-MM-DD" format',
          },
          timeslot: {
            type: 'string',
            description:
              'Expected values: "Morning", "Afternoon" or "All day". default is All day',
          },
        },
        required: ['date', 'timeslot'],
      },
    };
  }

  private getParkingAvailabilityHandlerFD() {
    return {
      name: 'getParkingAvailabilityHandler',
      description:
        ' for Amsterdam office, Get parking reservation information such as summary, availability' +
        ' Such as which parking spots are available and which parking spots are reserved and by whom,' +
        ' based on date and timeslot (Morning, Afternoon or All day)' +
        ' User can ask for available parking spots and parking spots reserved by themselves or someone else' +
        ' For Example: Check if I have reservation for Thursday,  give me names of people who has reservation for tomorrow',
      parameters: {
        type: 'object',
        properties: {
          date: {
            type: 'string',
            description: 'The date in "YYYY-MM-DD" format',
          },
          timeslot: {
            type: 'string',
            description:
              'Expected values: "Morning", "Afternoon" or "All day". default is All day',
          },
        },
        required: ['date', 'timeslot'],
      },
    };
  }

  private getDeskReservationsHandlerFD() {
    return {
      name: 'getDeskReservationsHandler',
      description:
        'This function provides a comprehensive summary of desk reservations in the Amsterdam office. ' +
        'It allows users to view details about desk reservations, ' +
        'including who has reserved which desk and the specific times of these reservations. ' +
        'This information is based on selected start and end dates and times. ' +
        'Users can inquire about their own desk reservations or find out who else has made a reservation for a particular day. ' +
        'For example, a user can check if they have a desk reserved for Thursday, ' +
        'get a list of people with reservations for tomorrow, or ' +
        'find out who has a desk reservation for the next day ' +
        'if there is desk reservation that means user is going to come to office that day',
      parameters: {
        type: 'object',
        properties: {
          start_date: {
            type: 'string',
            description: 'The date in "YYYY-MM-DD" format',
          },
          end_date: {
            type: 'string',
            description: 'The date in "YYYY-MM-DD" format',
          },
          start_time: {
            type: 'string',
            description: 'The date in "YYYY-MM-DD" format',
          },
          end_time: {
            type: 'string',
            description: 'The date in "YYYY-MM-DD" format',
          },
        },
        required: ['start_date', 'end_date'],
      },
    };
  }
}
