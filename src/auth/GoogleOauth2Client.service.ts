import { Injectable } from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleOauth2ClientService {
  private readonly oauth2Client: OAuth2Client;

  constructor(private readonly configService: ConfigService) {
    this.oauth2Client = new OAuth2Client({
      clientId: this.configService.get<string>('CLIENT_ID', ''),
      clientSecret: this.configService.get<string>('CLIENT_SECRET', ''),
      redirectUri: this.configService.get<string>('REDIRECT_URL', 'localhost'),
    });
  }

  getOauth2Client(): OAuth2Client {
    return this.oauth2Client;
  }
}
