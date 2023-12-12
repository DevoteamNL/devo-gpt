import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ThreadService } from './thread.service';
import { CreateThreadDto } from './dto/create-thread.dto';
import { UpdateThreadDto } from './dto/update-thread.dto';
import { MessageService } from '../message/message.service';
import { GoogleTokenGuard } from 'src/auth/guards/google-token.guard';

@UseGuards(GoogleTokenGuard)
@Controller('thread')
export class ThreadController {
  constructor(
    private readonly threadService: ThreadService,
    private readonly messageService: MessageService,
  ) {}

  @Post()
  async create(@Request() req, @Body() createThreadDto: CreateThreadDto) {
    createThreadDto.user = req.user; // Assuming the user object is available in the request after successful JWT authentication
    return this.threadService.create(createThreadDto);
  }

  @Get()
  findAllByUser(@Request() req) {
    const userId = req.user.id;
    return this.threadService.findAllByUser(userId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.threadService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateThreadDto: UpdateThreadDto) {
    return this.threadService.update(+id, updateThreadDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.threadService.remove(+id);
  }

  @Get(':threadId/messages')
  async getMessagesByThreadId(@Param('threadId') threadId: string) {
    return await this.messageService.findAllMessagesByThreadId(+threadId);
  }

  @Post(':threadId/messages')
  async addMessageToThread(
    @Param('threadId') threadId: string,
    @Body() messageContent: any,
  ) {
    return await this.messageService.create({
      threadId: +threadId,
      data: {
        role: 'user',
        content: messageContent.text,
      },
    });
  }
}
