import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from './users/users.module';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { SheetsModule } from './sheets/sheets.module';
import { CommunicationsService } from './communications/communications.service';
import { CommunicationsModule } from './communications/communications.module';
import { ScheduleModule } from '@nestjs/schedule';
import { OpenaiModule } from './openai/openai.module';

const ENV = process.env.NODE_ENV;
@Module({
  imports: [
    AuthModule,
    ConfigModule.forRoot({
      envFilePath: !ENV ? '.env' : `.env.${ENV}`,
      isGlobal: true,
    }),
    UsersModule,
    MikroOrmModule.forRoot(),
    SheetsModule,
    CommunicationsModule,
    ScheduleModule.forRoot(),
    OpenaiModule,
  ],
  controllers: [AppController],
  providers: [AppService, CommunicationsService],
})
export class AppModule {}
