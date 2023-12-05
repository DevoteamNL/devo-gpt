import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { OAuth2Client } from 'google-auth-library';
import passport from 'passport';

// TODO: Only allow threads and messages from this user.
export class CustomGoogleTokenStrategy extends passport.Strategy {
  name = 'google-oauth-jwt';

  private clientId: string;
  private readonly logger = new Logger(GoogleTokenStrategy.name);

  constructor({ clientId }: { clientId: string }) {
    super();

    this.clientId = clientId;
  }

  authenticate(req: Request) {
    if (req.headers.authorization === undefined) {
      return this.fail({ message: 'No authorization header' }, 401);
    }

    const client = new OAuth2Client();
    client
      .verifyIdToken({
        idToken: req.headers.authorization.replace('Bearer ', ''),
        audience: this.clientId,
      })
      .then((ticket) => {
        const payload = ticket.getPayload();
        const userid = payload['sub'];
        const domain = payload['hd'];

        if (domain !== 'devoteam.com') {
          this.fail({ message: 'Not a Devoteam account' });
        }
        this.success({ id: userid });
      })
      .catch(this.fail);
  }
}

@Injectable()
export class GoogleTokenStrategy extends PassportStrategy(
  CustomGoogleTokenStrategy,
  'google-oauth-jwt',
) {
  constructor(configService: ConfigService) {
    super({
      clientId: configService.get<string>('CLIENT_ID', ''),
    });
  }
}
