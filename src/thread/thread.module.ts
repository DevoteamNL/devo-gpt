import { Module } from '@nestjs/common';
import { ThreadService } from './thread.service';
import { ThreadController } from './thread.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Thread } from './entities/thread.entity';
import { MessageModule } from '../message/message.module';
import { OpenaiModule } from '../openai/openai.module';

@Module({
  imports: [TypeOrmModule.forFeature([Thread]), MessageModule, OpenaiModule],
  controllers: [ThreadController],
  providers: [ThreadService],
  exports: [ThreadService, TypeOrmModule],
})
export class ThreadModule {}
