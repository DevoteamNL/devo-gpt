import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { ConfigService } from '@nestjs/config';

interface Desk {
  id: string;
  name: string;
  schedule: any[];
}

@Injectable()
export class JoanDeskService {
  private axiosInstance: AxiosInstance;
  private token: string | null = null;
  private tokenExpiration: Date | null = null;
  private readonly logger = new Logger(JoanDeskService.name);
  private static BASE_URL_DESKS = '/api/2.0/portal/desks/schedule/';
  private static QUERY_PARAMS = {
    building_id: '1a3ed651-601c-4f53-b137-12af88f03df7',
    floor_id: 'b32795b0-cf99-48de-a59e-2b4f28e4d866',
    limit: '1000',
    search: '',
    tz: 'Europe/Amsterdam',
  };

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

  // retrieve list of available desks
  // Accepts from and to builds query parametes start and end as seen below, all other parameters are static
  // calls https://portal.getjoan.com/api/2.0/portal/desks/schedule/?building_id=1a3ed651-601c-4f53-b137-12af88f03df7&end=2023-10-27T21:59:59.999Z&floor_id=b32795b0-cf99-48de-a59e-2b4f28e4d866&limit=1000&search=&start=2023-10-27T12:00:00.000Z&tz=Europe/Amsterdam
  // returns list of available desks
  // ...

  public async getAvailableDesks(from: string, to: string): Promise<string[]> {
    const endpoint = `${JoanDeskService.BASE_URL_DESKS}?${this.getQueryString(
      from,
      to,
    )}`;

    const data = await this.handleRequest(endpoint);

    // Filter out the desks that have a non-empty schedule (indicating they are not available)
    const availableDesks = data.results.filter(
      (desk: Desk) => desk.schedule.length === 0,
    );

    // Extract only the desk names from the available desks list
    return availableDesks.map((desk: Desk) => desk.name);
  }

  private getQueryString(from: string, to: string): string {
    return Object.entries({
      ...JoanDeskService.QUERY_PARAMS,
      start: from,
      end: to,
    })
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join('&');
  }
}
