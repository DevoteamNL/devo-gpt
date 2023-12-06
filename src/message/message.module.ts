import { forwardRef, Module } from '@nestjs/common';
import { MessageService } from './message.service';
import { MessageController } from './message.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Message } from './entities/message.entity';
import { ThreadModule } from '../thread/thread.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Message]),
    forwardRef(() => ThreadModule),
  ],
  controllers: [MessageController],
  providers: [MessageService],
  exports: [TypeOrmModule, MessageService],
})
export class MessageModule {}
