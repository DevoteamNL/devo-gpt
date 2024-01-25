import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Logger,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ThreadService } from './thread.service';
import { CreateThreadDto } from './dto/create-thread.dto';
import { UpdateThreadDto } from './dto/update-thread.dto';
import { MessageService } from '../message/message.service';
import { GoogleTokenGuard } from 'src/auth/guards/google-token.guard';
import { ConfigService } from '@nestjs/config';
import { Thread } from './entities/thread.entity';
import { OpenaiChatService } from '../openai/openai-chat.service';

@UseGuards(GoogleTokenGuard)
@Controller('thread')
export class ThreadController {
  private logger: Logger = new Logger('ThreadController');
  constructor(
    private readonly threadService: ThreadService,
    private readonly messageService: MessageService,
    private readonly configService: ConfigService,
    private readonly OpenaiChatService: OpenaiChatService,
  ) {}

  @Post()
  async create(@Request() req, @Body() createThreadDto: CreateThreadDto) {
    createThreadDto.user = req.user;
    const thread: Thread = await this.threadService.create(createThreadDto);
    this.logger.log(`Created thread: ${JSON.stringify(thread)}`);

    // Calling Model to get response
    const chatMessage = createThreadDto.message;
    const senderName = req.user.name;
    const senderEmail = req.user.username;
    this.logger.log(
      `NAME:${senderName}, CHAT_MESSAGE:${chatMessage}, SENDER_EMAIL: ${senderEmail}`,
    );
    await this.OpenaiChatService.getChatResponse({
      senderName,
      senderEmail,
      threadId: thread.id,
      plugin: thread.plugin,
    });
    return {
      ...thread,
      messages: await this.messageService.findChatMessagesByThreadId(thread.id),
    };
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
    @Request() req,
    @Param('threadId') threadId: string,
    @Body() messageContent: any,
  ) {
    const userMessageCount = await this.messageService.countUserMessages(
      +threadId,
    );
    this.logger.log(`User message count: ${userMessageCount}`);
    const MESSAGES_PER_THREAD = this.configService.get('MESSAGES_PER_THREAD');
    if (userMessageCount >= MESSAGES_PER_THREAD) {
      throw new HttpException(
        {
          status: HttpStatus.TOO_MANY_REQUESTS,
          error: `You can only send ${MESSAGES_PER_THREAD} messages to a thread`,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    await this.messageService.create({
      threadId: +threadId,
      data: {
        role: 'user',
        content: messageContent.text,
      },
    });

    const thread = await this.threadService.findOne(+threadId);
    const chatMessage = messageContent.text;
    const senderName = req.user.name;
    const senderEmail = req.user.username;
    this.logger.log(
      `NAME:${senderName}, CHAT_MESSAGE:${chatMessage}, SENDER_EMAIL: ${senderEmail}`,
    );
    const reply = await this.OpenaiChatService.getChatResponse({
      senderName,
      senderEmail,
      threadId,
      plugin: thread.plugin,
    });

    return {
      id: reply.id,
      data: reply.data,
    };
  }
}
