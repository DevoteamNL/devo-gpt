import { Injectable, Logger } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { GoogleOauth2ClientService } from './GoogleOauth2Client.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private oAuth2Client;

  constructor(
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
    private readonly googleOauth2ClientService: GoogleOauth2ClientService,
  ) {
    this.oAuth2Client = this.googleOauth2ClientService.getOauth2Client();
  }

  async refreshAccessToken() {
    const id = await this._retrieveGCPUserId();
    this.logger.log(`Geting user information for user id: ${id}`);
    const user = await this.usersService.findOne(id);

    this.oAuth2Client.setCredentials({
      access_token: user.google_token,
      refresh_token: user.refresh_token,
    });
    this.logger.log('Refreshing access token');
    await this.oAuth2Client.refreshAccessToken();
    this.logger.log('Access token refreshed');
  }

  async _retrieveGCPUserId() {
    const user = await this.usersService.findByUsername(
      this.configService.get('EMAIL_SENDER'),
    );
    return user.id;
  }
}
