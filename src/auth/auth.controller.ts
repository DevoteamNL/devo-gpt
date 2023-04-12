import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { GoogleOauthGuard } from './guards/google-oauth.guard';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { SESSION_COOKIE_KEY } from '../config/constants';
import { JwtAuthService } from './jwt/jwt-auth.service';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
    private jwtAuthService: JwtAuthService,
  ) {}

  @Get('google')
  @UseGuards(GoogleOauthGuard)
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async auth() {}

  @Get('refresh-token')
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async refresh_access_token() {
    await this.authService.refreshAccessToken();
    return 'ok';
  }

  @Get('redirect')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req: Request, @Res() res: Response) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const { accessToken } = this.jwtAuthService.login(req.user);
    res.cookie(SESSION_COOKIE_KEY, accessToken, {
      httpOnly: true,
      sameSite: 'lax',
    });
    return res.redirect('/api/users');
  }
}
