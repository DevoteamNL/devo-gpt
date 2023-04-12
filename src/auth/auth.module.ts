import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ConfigModule } from '@nestjs/config';
import { GoogleStrategy } from './strategies/google.strategy';
import { UsersModule } from '../users/users.module';
import { JwtAuthModule } from './jwt/jwt-auth.module';
import { GoogleOauth2ClientService } from './GoogleOauth2Client.service';

@Module({
  imports: [ConfigModule, UsersModule, JwtAuthModule],
  controllers: [AuthController],
  providers: [AuthService, GoogleStrategy, GoogleOauth2ClientService],
  exports: [GoogleOauth2ClientService],
})
export class AuthModule {}
