import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { Message } from './entities/message.entity';
import { Thread } from '../thread/entities/thread.entity';
import { In, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class MessageService {
  private logger: Logger = new Logger('MessageService');
  constructor(
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
  ) {}
  findAll() {
    return `This action returns all message`;
  }

  findOne(id: number) {
    return `This action returns a #${id} message`;
  }

  update(id: number, updateMessageDto: UpdateMessageDto) {
    return `This action updates a #${id} message`;
  }

  remove(id: number) {
    return `This action removes a #${id} message`;
  }

  async findAllMessagesByThreadId(threadId: number): Promise<Message[]> {
    const messages: Message[] = await this.messageRepository.find({
      where: { thread: { id: threadId } },
      order: { id: 'ASC' },
    });
    return messages.map((message: Message) => message.data);
  }

  async findChatMessagesByThreadId(threadId: number): Promise<Message[]> {
    const messages: Message[] = await this.messageRepository.find({
      where: {
        thread: { id: threadId },
        data: { role: In(['user', 'assistant']) },
      },
      order: { id: 'ASC' },
    });
    return messages.map((message: Message) => message.data);
  }

  async create(createMessageDto: CreateMessageDto): Promise<Message> {
    const message = this.messageRepository.create({
      thread: { id: createMessageDto.threadId } as Thread, // Assuming you only need the ID for the relationship
      data: createMessageDto.data,
    });
    return await this.messageRepository.save(message);
  }

  async findMessagesByRole(
    threadId: number,
    roles: string[],
  ): Promise<Message[]> {
    try {
      return this.messageRepository.find({
        where: {
          thread: { id: threadId },
          data: { role: In(roles) }, // Filter by role
        },
        order: {
          id: 'DESC', // Order by ID in descending order
        },
      });
    } catch (error) {
      this.logger.error(`Failed to find messages: ${error.message}`);
      throw error;
    }
  }

  async countUserMessages(threadId: number): Promise<number> {
    try {
      return this.messageRepository.count({
        where: {
          thread: { id: threadId },
          data: { role: 'user' }, // Count messages with role 'user'
        },
      });
    } catch (error) {
      this.logger.error(`Failed to count user messages: ${error.message}`);
      throw error;
    }
  }
}
