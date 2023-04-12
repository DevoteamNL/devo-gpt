import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-google-oauth20';
import { UsersService } from '../../users/users.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly logger = new Logger(GoogleStrategy.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      clientID: configService.get<string>('CLIENT_ID', ''),
      clientSecret: configService.get<string>('CLIENT_SECRET', ''),
      callbackURL: configService.get<string>('REDIRECT_URL', 'localhost'),
      scope: [
        'profile',
        'email',
        'https://www.googleapis.com/auth/spreadsheets.readonly',
        'https://mail.google.com/',
        'https://www.googleapis.com/auth/gmail.modify',
        'https://www.googleapis.com/auth/gmail.compose',
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/youtube.readonly',
      ],
      accessType: 'offline',
      prompt: 'consent',
      includeGrantedScopes: false,
    });
  }

  authorizationParams(): { [key: string]: string } {
    return {
      access_type: 'offline',
    };
  }
  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
  ): Promise<any> {
    const { id, emails } = profile;
    this.logger.log(`Validating user ${id}`);
    let user = await this.usersService.findByProviderId(id);
    if (!user) {
      user = await this.usersService.create({
        providerId: id,
        username: emails[0].value,
        google_token: accessToken,
        ...(refreshToken && { refresh_token: refreshToken }),
      });
    }
    return user;
  }
}
