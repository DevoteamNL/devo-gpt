import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { ConfigService } from '@nestjs/config';
import { FunctionDefinition } from '@azure/openai';
import moment from 'moment-timezone';

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
export class JoanDeskService {
  private axiosInstance: AxiosInstance;
  private token: string | null = null;
  private tokenExpiration: Date | null = null;
  private readonly logger = new Logger(JoanDeskService.name);
  private readonly timeZone = 'Europe/Amsterdam';

  constructor(private readonly configService: ConfigService) {
    this.axiosInstance = axios.create({
      baseURL: 'https://portal.getjoan.com',
    });
  }

  private async authenticate(): Promise<void> {
    const encodedCredentials = Buffer.from(
      `${this.configService.get('JOAN_CLIENT_ID')}:${this.configService.get(
        'JOAN_CLIENT_SECRET',
      )}`,
    ).toString('base64');
    try {
      this.logger.log('Authenticating with Joan');
      const response = await this.axiosInstance.post(
        '/api/token/',
        {
          grant_type: 'client_credentials',
        },
        {
          headers: {
            Authorization: `Basic ${encodedCredentials}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );
      this.token = response.data.access_token;
      this.tokenExpiration = new Date(
        Date.now() + (response.data.expires_in - 300) * 1000,
      ); // Refresh 5 minutes before expiry
      this.logger.log('Authenticated with Joan');
    } catch (error) {
      throw new HttpException('Authentication failed', HttpStatus.UNAUTHORIZED);
    }
  }

  private async refreshToken(): Promise<void> {
    if (this.isTokenExpired()) {
      this.logger.log('Refreshing token');
      await this.authenticate();
    }
  }

  private isTokenExpired(): boolean {
    if (!this.tokenExpiration) return true;
    return this.tokenExpiration.getTime() <= Date.now();
  }

  private async handleRequest(url: string, options: any = {}): Promise<any> {
    if (this.isTokenExpired()) {
      await this.refreshToken();
    }

    try {
      this.logger.log(`Calling Joan API: ${url}`);
      const response = await this.axiosInstance(url, {
        ...options,
        headers: { Authorization: `Bearer ${this.token}`, ...options.headers },
      });
      return response.data;
    } catch (error) {
      if (error.response && error.response.status === 401) {
        await this.refreshToken();
        return this.handleRequest(url, options);
      }

      throw error;
    }
  }

  public async getMe(endpoint: string): Promise<any> {
    return this.handleRequest(endpoint);
  }

  public async getDeskReservations(
    start_date: string,
    end_date: string,
    start_time: string,
    end_time: string,
  ): Promise<string> {
    try {
      const QUERY_PARAMS = {
        building_id: '1a3ed651-601c-4f53-b137-12af88f03df7',
        floor_id: 'b32795b0-cf99-48de-a59e-2b4f28e4d866',
        limit: '1000',
        search: '',
        tz: 'Europe/Amsterdam',
        start: `${start_date}T${start_time}:00.000Z`,
        end: `${end_date}T${end_time}:00.000Z`,
      };
      const endpoint = `/api/2.0/portal/desks/reservations/?${this.getQueryString(
        QUERY_PARAMS,
      )}`;

      this.logger.log(`Calling Joan API GetDesksReservations: ${endpoint}`);
      const data = await this.handleRequest(endpoint);

      // Extract only the desk names from the available desks list

      return data.results
        .map((reservation) => {
          const deskName = reservation.desk.name;
          const start = reservation.start;
          const end = reservation.end;
          const fullName = `${reservation.user.first_name} ${reservation.user.last_name}`;
          const email = reservation.user.email;

          return `${deskName},${start},${end},${fullName},${email}`;
        })
        .join('\n');
    } catch (error) {
      // If an error occurs (e.g., status 400 or 500), convert error to string and return
      this.logger.log(`Error getting desks reservation information: ${error}`);
      throw error;
    }
  }

  // retrieve list of available desks
  // Accepts from and to builds query parametes start and end as seen below, all other parameters are static
  // calls https://portal.getjoan.com/api/2.0/portal/desks/schedule/?building_id=1a3ed651-601c-4f53-b137-12af88f03df7&end=2023-10-27T21:59:59.999Z&floor_id=b32795b0-cf99-48de-a59e-2b4f28e4d866&limit=1000&search=&start=2023-10-27T12:00:00.000Z&tz=Europe/Amsterdam
  // returns list of available desks
  // ...

  public async getAvailableDesks(from: string, to: string): Promise<string[]> {
    try {
      const QUERY_PARAMS = {
        building_id: '1a3ed651-601c-4f53-b137-12af88f03df7',
        floor_id: 'b32795b0-cf99-48de-a59e-2b4f28e4d866',
        limit: '1000',
        search: '',
        tz: 'Europe/Amsterdam',
        start: from,
        end: to,
      };
      const endpoint = `/api/2.0/portal/desks/schedule/?${this.getQueryString(
        QUERY_PARAMS,
      )}`;

      this.logger.log(`Calling Joan API GetAvailableDesks: ${endpoint}`);
      const data = await this.handleRequest(endpoint);

      // Filter out the desks that have a non-empty schedule (indicating they are not available)
      const availableDesks = data.results.filter(
        (desk: Desk) => desk.schedule.length === 0,
      );

      // Extract only the desk names from the available desks list
      return availableDesks.map((desk: Desk) => desk.name);
    } catch (error) {
      // If an error occurs (e.g., status 400 or 500), convert error to string and return
      this.logger.log(`Error getting available desks: ${error}`);
      throw error;
    }
  }

  // Make desk reservation for Amsterdam office, based on desk name and date timeslot (Morning, Afternoon or full/all day)
  public async postDeskReservation(
    email: string, // passed internally from chat controller
    deskName: string, // passed by GPT
    date: string, // passed by GPT
    timeslot: string, // passed by GPT
  ): Promise<string> {
    // First retrieve list of desks ids and name, filter and find id of the deskName passed in argument
    try {
      const query_params = {
        limit: '1000',
        search: deskName, // Assuming 'search' is the correct parameter to filter by desk name
        // Include other required static parameters if needed
      };
      const endpoint = `/api/2.0/portal/desks/?${this.getQueryString(
        query_params,
      )}`;

      this.logger.log(`Calling Joan API GetDeskNames: ${endpoint}`);
      const deskIdsResponse = await this.handleRequest(endpoint);
      const deskId =
        deskIdsResponse.results.find((item) => item.name === deskName)?.id ||
        null;

      const query_params_slots = {
        limit: '1000',
      };
      const endpoint_slots = `/api/2.0/desk/slots/?${this.getQueryString(
        query_params_slots,
      )}`;
      this.logger.log(`Calling Joan API GetDeskTimeSlots: ${endpoint_slots}`);
      const deskSlotsResponse = await this.handleRequest(endpoint_slots);
      const slot = deskSlotsResponse.find(
        (s) => s.name === timeslot && s.active,
      );

      const timeZone = 'Europe/Amsterdam';

      const start = moment.tz(`${date} ${slot.from}`, timeZone).format();
      const end = moment.tz(`${date} ${slot.to}`, timeZone).format();

      const desk_reservation_post_data = {
        user_email: email,
        desk_id: deskId,
        tz: 'Europe/Amsterdam',
        start,
        end,
        timeslot_id: slot.id,
      };
      const endpoint_reservation = '/api/2.0/portal/desks/reservations/';
      this.logger.log(
        `Calling Joan API PostDeskReservation: ${endpoint_reservation}, RequestBody: ${JSON.stringify(
          desk_reservation_post_data,
        )}`,
      );
      const reservationResponse = await this.handleRequest(
        endpoint_reservation,
        {
          method: 'POST',
          data: desk_reservation_post_data,
        },
      );
      this.logger.log(`Reservation response: ${reservationResponse}`);
      return JSON.stringify(reservationResponse); // Convert the response to a string
    } catch (error) {
      // If an error occurs (e.g., status 400 or 500), convert error to string and return
      this.logger.log(
        `Error during reservation: ${error} , message: ${JSON.stringify(
          error.response?.data,
        )}`,
      );
      return JSON.stringify(error.response?.data); // Convert the error to a string
    }
  }

  private async getStartAndEnd(timeslot: string) {
    const query_params_slots = {
      limit: '1000',
    };
    const endpoint_slots = `/api/2.0/desk/slots/?${this.getQueryString(
      query_params_slots,
    )}`;
    this.logger.log(`Calling Joan API GetDeskTimeSlots: ${endpoint_slots}`);
    const deskSlotsResponse = await this.handleRequest(endpoint_slots);
    return deskSlotsResponse.find((s) => s.name === timeslot && s.active);
  }

  public async getAvailableParkingSpots(options: ParkingSpotOptions) {
    let {
      start,
      end,
      show = 'All', // Default to 'All' if not provided
      date,
      timeslot,
    } = options;
    // Check if either both start and end are provided, or date and timeslot are provided
    if (start && end && (date || timeslot)) {
      throw new Error(
        'Provide either start and end or date and timeslot, not both.',
      );
    }

    // Calculate start and end if not provided
    if (!start || !end) {
      if (date && timeslot) {
        const slot = await this.getStartAndEnd(timeslot);
        start = moment.tz(`${date} ${slot.from}`, this.timeZone).format();
        end = moment.tz(`${date} ${slot.to}`, this.timeZone).format();
      } else {
        throw new Error(
          'Both date and timeslot must be provided if start and end are not.',
        );
      }
    }

    const query_params = {
      tz: this.timeZone,
      start,
      end,
      // Removed the 'show' parameter from query_params as it's not used in the API call
    };

    // Construct the API endpoint using query parameters
    const endpoint = `/api/2.0/portal/assets/schedule/?${this.getQueryString(
      query_params,
    )}`;
    this.logger.log(`Calling Joan API parking/schedule: ${endpoint}`);

    // API request handler
    const response = await this.handleRequest(endpoint);

    // Filtering results based on availability
    const filteredResults = response.results.filter((parkingSpot: any) => {
      const isAvailable = parkingSpot.schedule.length === 0;
      return (
        show === 'All' ||
        (isAvailable ? show === 'available' : show === 'reserved')
      );
    });

    // Mapping results to the desired format
    return filteredResults.map((parkingSpot: any) => {
      const reservationStatus =
        parkingSpot.schedule.length === 0 ? 'Available' : 'Reserved';
      const reservedBy =
        parkingSpot.schedule.length === 0
          ? null
          : parkingSpot.schedule[0].reservations
            .map(
              (reservation: any) =>
                `${reservation.user.first_name} ${reservation.user.last_name}`,
            )
            .join(', '); // Handling multiple reservations

      return {
        id: parkingSpot.id,
        name: parkingSpot.name,
        reservationStatus,
        reservedBy,
        toString: function() {
          // Construct the string with available properties, omitting 'reserved by' if not applicable
          return `${this.name}, ${this.reservationStatus}${
            this.reservedBy ? `, ${this.reservedBy}` : ''
          }`;
        },
      };
    });
  }

  public async postParkingReservation(
    email: string, // passed internally from chat controller
    date: string, // passed by GPT
    timeslot: string, // passed by GPT
  ): Promise<string> {
    const slot = await this.getStartAndEnd(timeslot);
    const start = moment.tz(`${date} ${slot.from}`, this.timeZone).format();
    const end = moment.tz(`${date} ${slot.to}`, this.timeZone).format();

    // First retrieve available parking spots
    try {
      const availableParkingSpots = await this.getAvailableParkingSpots({
        start,
        end,
        show: 'available',
      });
      if (availableParkingSpots.length >= 1) {
        const parking_reservation_post_data = {
          user_email: email,
          asset_id: availableParkingSpots[0].id,
          tz: 'Europe/Amsterdam',
          start,
          end,
          timeslot_id: slot.id,
        };
        const parking_reservation_endpoint =
          '/api/2.0/portal/assets/reservations/';
        this.logger.log(
          `Calling Joan API PostParkingReservation: ${parking_reservation_endpoint},
           RequestBody: ${JSON.stringify(parking_reservation_post_data)}`,
        );
        const reservationResponse = await this.handleRequest(
          parking_reservation_endpoint,
          {
            method: 'POST',
            data: parking_reservation_post_data,
          },
        );
        this.logger.log(
          `Parking Reservation response: ${JSON.stringify(
            reservationResponse,
          )}`,
        );
        return reservationResponse; // Convert the response to a string
      } else {
        return 'No parking spots available';
      }
    } catch (error) {
      // If an error occurs (e.g., status 400 or 500), convert error to string and return
      this.logger.log(
        `Error during reservation: ${error} , message: ${JSON.stringify(
          error.response?.data,
        )}`,
      );
      throw error;
    }
  }

  private getQueryString(queryParams: { [key: string]: any }): string {
    return Object.entries(queryParams)
      .filter(([_, value]) => value !== undefined && value !== null)
      .map(
        ([key, value]) =>
          `${encodeURIComponent(key)}=${encodeURIComponent(value)}`,
      )
      .join('&');
  }

  public getFunctionDefinitions() {
    return [
      this.getAvailableDesksHandlerFunctionDefinition(),
      this.postDeskReservationHandlerFunctionDefinition(),
      this.postParkingReservationHandlerFunctionDefinition(),
      this.getParkingAvailabilityHandlerFunctionDefinition(),
      this.getDeskReservationsHandlerFunctionDefinition(),
    ];
  }

  private getAvailableDesksHandlerFunctionDefinition(): FunctionDefinition {
    return {
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
  }

  // Make desk reservation for Amsterdam office, based on desk name and date timeslot (Morning, Afternoon or full/all day)
  private postDeskReservationHandlerFunctionDefinition() {
    return {
      name: 'postDeskReservation',
      description:
        'Make desk reservation/booking for Amsterdam office, based on desk name and date timeslot (Morning, Afternoon or All day)',
      parameters: {
        type: 'object',
        properties: {
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

  private postParkingReservationHandlerFunctionDefinition() {
    return {
      name: 'postParkingReservationHandler',
      description:
        'Make parking/parking spot reservation/booking for Amsterdam office, based on date and timeslot (Morning, Afternoon or All day)',
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

  private getParkingAvailabilityHandlerFunctionDefinition() {
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

  private getDeskReservationsHandlerFunctionDefinition() {
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
