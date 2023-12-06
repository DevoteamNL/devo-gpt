import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThreadModule } from '../thread/thread.module';
import { ThreadService } from '../thread/thread.service';
import { MessageModule } from '../message/message.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]), // Add User entity to forFeature
    ThreadModule,
    MessageModule,
  ],
  controllers: [UsersController],
  providers: [UsersService, ThreadService],
  exports: [UsersService],
})
export class UsersModule {}
