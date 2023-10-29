import { Module } from '@nestjs/common';
import { SheetsService } from './sheets.service';
import { UsersModule } from '../users/users.module';
import { CommunicationsModule } from '../communications/communications.module';
import { AuthModule } from '../auth/auth.module';
// import { OpenaiModule } from '../openai/openai.module';
import { UtilsModule } from '../utils/utils.module';

@Module({
  imports: [
    UsersModule,
    CommunicationsModule,
    AuthModule,
    // OpenaiModule,
    UtilsModule,
  ],
  providers: [SheetsService],
  exports: [SheetsService],
})
export class SheetsModule {}
