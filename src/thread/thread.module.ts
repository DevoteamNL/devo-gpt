import { forwardRef, Module } from '@nestjs/common';
import { ThreadService } from './thread.service';
import { ThreadController } from './thread.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Thread } from './entities/thread.entity';
import { Message } from '../message/entities/message.entity';
import { MessageModule } from '../message/message.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Thread]),
    forwardRef(() => MessageModule),
  ],
  controllers: [ThreadController],
  providers: [ThreadService],
  exports: [ThreadService, TypeOrmModule],
})
export class ThreadModule {}
