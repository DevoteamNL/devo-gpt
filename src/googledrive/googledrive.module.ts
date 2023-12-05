import { Module } from '@nestjs/common';
import { GoogledriveService } from './googledrive.service';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module';
import { OpenaiModule } from '../openai/openai.module';
import { UtilsModule } from '../utils/utils.module';
import { CognitiveSearchModule } from '../cognitive-search/cognitive-search.module';

@Module({
  imports: [
    UsersModule,
    AuthModule,
    OpenaiModule,
    UtilsModule,
    CognitiveSearchModule,
  ],
  providers: [GoogledriveService],
  exports: [GoogledriveService],
})
export class GoogledriveModule {}
