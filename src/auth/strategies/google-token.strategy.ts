import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { OAuth2Client } from 'google-auth-library';
import passport from 'passport';
import { UsersService } from 'src/users/users.service';

// TODO: Only allow threads and messages from this user.
export class CustomGoogleTokenStrategy extends passport.Strategy {
  name = 'google-oauth-jwt';

  private readonly logger = new Logger(GoogleTokenStrategy.name);

  constructor() {
    super();
  }
}

@Injectable()
export class GoogleTokenStrategy extends PassportStrategy(
  CustomGoogleTokenStrategy,
  'google-oauth-jwt',
) {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super();
  }

  authenticate(req: Request) {
    if (req.headers.authorization === undefined) {
      return this.fail({ message: 'No authorization header' }, 401);
    }

    const client = new OAuth2Client();
    client
      .verifyIdToken({
        idToken: req.headers.authorization.replace('Bearer ', ''),
        audience: this.configService.get<string>('CLIENT_ID', ''),
      })
      .then(async (ticket) => {
        const payload = ticket.getPayload();
        const { sub: googleId, hd: domain, email, name } = payload;

        if (domain !== 'devoteam.com') {
          this.fail({ message: 'Not a Devoteam account' });
        }

        if (name === undefined) {
          // Can happen if scope isn't set correctly.
          this.fail({ message: 'No name in Google profile' });
        }

        let user = await this.usersService.findByProviderId(googleId);
        if (!user) {
          user = await this.usersService.create({
            providerId: googleId,
            username: email,
            google_token: '',
            refresh_token: '',
            name: name,
          });
        } else {
          if (!user.is_active) {
            this.fail({ message: 'User account is not active.' });
          }
        }
        this.success(user);
      })
      .catch(this.fail);
  }
}
