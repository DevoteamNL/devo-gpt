import { Logger, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from './users/users.module';
import { SheetsModule } from './sheets/sheets.module';
import { CommunicationsService } from './communications/communications.service';
import { CommunicationsModule } from './communications/communications.module';
import { ScheduleModule } from '@nestjs/schedule';
import { OpenaiModule } from './openai/openai.module';
import { UtilsModule } from './utils/utils.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GoogledriveModule } from './googledrive/googledrive.module';
import { CognitiveSearchModule } from './cognitive-search/cognitive-search.module';
import { ChatModule } from './chat/chat.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { ExtendedLoggerService } from './utils/extended-logger/extended-logger.service';
import { EmployeesModule } from './employees/employees.module';
import { ThreadModule } from './thread/thread.module';
import { MessageModule } from './message/message.module';

const ENV = process.env.NODE_ENV;

@Module({
  imports: [
    AuthModule,
    ConfigModule.forRoot({
      envFilePath: !ENV ? '.env' : `.env.${ENV}`,
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 5432,
      username: process.env.DB_USERNAME || 'your_db_username',
      password: process.env.DB_PASSWORD || 'your_db_password',
      database: process.env.DB_NAME || 'your_db_name',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true, // Change this for PROD
      logging: true,
      ssl: false, // Change this for PROD
    }),
    UsersModule,
    SheetsModule,
    CommunicationsModule,
    ScheduleModule.forRoot(),
    OpenaiModule,
    UtilsModule,
    GoogledriveModule,
    CognitiveSearchModule,
    ChatModule,
    IntegrationsModule,
    EmployeesModule,
    ThreadModule,
    MessageModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    CommunicationsService,
    {
      provide: Logger,
      useClass: ExtendedLoggerService,
    },
  ],
})
export class AppModule {}
