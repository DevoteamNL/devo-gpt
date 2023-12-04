import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThreadModule } from '../thread/thread.module';
import { ThreadService } from '../thread/thread.service';
import { Thread } from '../thread/entities/thread.entity';
import { Message } from '../message/entities/message.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Thread, Message]), // Add User entity to forFeature
    ThreadModule,
  ],
  controllers: [UsersController],
  providers: [UsersService, ThreadService],
  exports: [UsersService],
})
export class UsersModule {}
