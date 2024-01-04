import axios, { AxiosInstance } from 'axios';
import moment from 'moment-timezone';
import { ConfigService } from '../types';
import { Definition } from '../definition.decorator';
import { Plugin } from '../plugin.decorator';

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

@Plugin({ displayName: 'Joan' })
export class JoanPlugin {
  private axiosInstance: AxiosInstance;
  private token: string | null = null;
  private tokenExpiration: Date | null = null;
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
    } catch (error) {
      throw new Error('Authentication failed');
    }
  }

  private async refreshToken(): Promise<void> {
    if (this.isTokenExpired()) {
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

  @Definition({
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

    followUpPrompt:
      'Below information is in CSV format, It is desk reservation details by all employee.' +
      '\nIf there is desk reservation by a user, that means that user is going to come to office that day.' +
      // '\n\n If use asked if he has desk reservation? you can check above data to see if user has any reservations' +
      // '\n\n User can also ask who has desk reservations? then you can provide him details of each user and their desk name' +
      '\nTry to include calculated date and day name in response, and keep answer as concise as possible, as short as possible.' +
      '\n\n\n' +
      'Desk Name,Reservation Start,Reservation end,Employee Name(Reserved By),Employee Email\n',
    followUpTemperature: 0.7,
    followUpModel: 'gpt-35-turbo-16k',
  })
  private async getDeskReservations({
    start_date,
    end_date,
    start_time,
    end_time,
  }: {
    start_date: string;
    end_date: string;
    start_time?: string;
    end_time?: string;
  }): Promise<string> {
    try {
      const QUERY_PARAMS = {
        building_id: '1a3ed651-601c-4f53-b137-12af88f03df7',
        floor_id: 'b32795b0-cf99-48de-a59e-2b4f28e4d866',
        limit: '1000',
        search: '',
        tz: 'Europe/Amsterdam',
        start: `${start_date}T${start_time || '06:00'}:00.000Z`,
        end: `${end_date}T${end_time || '18:00'}:00.000Z`,
      };
      const endpoint = `/api/2.0/portal/desks/reservations/?${this.getQueryString(
        QUERY_PARAMS,
      )}`;

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
      throw new Error(
        'Something went wrong while retrieving desk information, try again later.',
      );
    }
  }

  // retrieve list of available desks
  // Accepts from and to builds query parametes start and end as seen below, all other parameters are static
  // calls https://portal.getjoan.com/api/2.0/portal/desks/schedule/?building_id=1a3ed651-601c-4f53-b137-12af88f03df7&end=2023-10-27T21:59:59.999Z&floor_id=b32795b0-cf99-48de-a59e-2b4f28e4d866&limit=1000&search=&start=2023-10-27T12:00:00.000Z&tz=Europe/Amsterdam
  // returns list of available desks
  // ...

  @Definition({
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

    followUpPrompt:
      'Respond with calculated date and day and concise/short answer as possible with desk names, Such as available desk are "High table #3", "From High table #6 to High table #13" ' +
      '\n\n\n',
  })
  private async getAvailableDesks({
    from,
    to,
  }: {
    from: string;
    to: string;
  }): Promise<string> {
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

      const data = await this.handleRequest(endpoint);

      // Filter out the desks that have a non-empty schedule (indicating they are not available)
      const availableDesks = data.results.filter(
        (desk: Desk) => desk.schedule.length === 0,
      );

      // Extract only the desk names from the available desks list
      return availableDesks.map((desk: Desk) => desk.name).toString();
    } catch (error) {
      throw new Error('Could not retrieve available desks.');
    }
  }

  @Definition({
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
    followUpPrompt:
      'Respond with calculated date and day and full name like "Bar table #6", "Desk #1 - Dual Monitor"' +
      '\n\n\n',
  })
  private async postDeskReservation({
    email,
    deskName,
    date,
    timeslot,
  }: {
    email: string; // passed internally from chat controller
    deskName: string; // passed by GPT
    date: string; // passed by GPT
    timeslot: string; // passed by GPT
  }): Promise<string> {
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
      const reservationResponse = await this.handleRequest(
        endpoint_reservation,
        {
          method: 'POST',
          data: desk_reservation_post_data,
        },
      );
      return JSON.stringify(reservationResponse); // Convert the response to a string
    } catch (error) {
      // If an error occurs (e.g., status 400 or 500), convert error to string and return
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
    const deskSlotsResponse = await this.handleRequest(endpoint_slots);
    return deskSlotsResponse.find((s) => s.name === timeslot && s.active);
  }

  @Definition({
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

    followUpPrompt:
      'Below information is parking reservation details in CSV format' +
      '\n If use asked if he has parking? you can check above data to see if user has any reservations' +
      '\n User can also ask who has parking reservations? then you can provide him details of each user and their parking number' +
      'Try to include calculated date and day name in response.' +
      '\n\n\n' +
      'Garage Name and Number,Reservation Status (Reserved/Available),Employee Name(Reserved By)\n',
    followUpTemperature: 0.3,
    followUpModel: 'gpt-35-turbo-16k',
  })
  private async getAvailableParkingSpots(options: ParkingSpotOptions) {
    try {
      let { start, end } = options;
      const {
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
      return filteredResults
        .map((parkingSpot: any) => {
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
            toString: function () {
              // Construct the string with available properties, omitting 'reserved by' if not applicable
              return `${this.name}, ${this.reservationStatus}${
                this.reservedBy ? `, ${this.reservedBy}` : ''
              }`;
            },
          };
        })
        .toString();
    } catch (error) {
      throw new Error(
        'Something went wrong while retrieving parking information, try again later.',
      );
    }
  }

  @Definition({
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

    followUpPrompt:
      'Respond based on user message like parking spot summary, availability, or parking reservation details ' +
      'and also included calculated date and day in response' +
      'Example query can be: do I have parking reservation for tomorrow?, give me names of people who has reservation for tomorrow\n\n\n' +
      'You may ask follow up question if user wants to reserve desk also' +
      '\n\n\n',
    followUpTemperature: 0.3,
    clearAfterExecution: true,
  })
  private async postParkingReservation({
    email,
    date,
    timeslot,
  }: {
    email: string; // passed internally from chat controller
    date: string; // passed by GPT
    timeslot: string; // passed by GPT
  }): Promise<string> {
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
        const reservationResponse = await this.handleRequest(
          parking_reservation_endpoint,
          {
            method: 'POST',
            data: parking_reservation_post_data,
          },
        );
        return reservationResponse; // Convert the response to a string
      } else {
        return 'No parking spots available';
      }
    } catch (error) {
      throw new Error(
        'Could not make parking reservation. Something went wrong.',
      );
    }
  }

  private getQueryString(queryParams: { [key: string]: any }): string {
    return Object.entries(queryParams)
      .filter(([, value]) => value !== undefined && value !== null)
      .map(
        ([key, value]) =>
          `${encodeURIComponent(key)}=${encodeURIComponent(value)}`,
      )
      .join('&');
  }
}
