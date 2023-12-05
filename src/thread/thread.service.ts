import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateThreadDto } from './dto/create-thread.dto';
import { UpdateThreadDto } from './dto/update-thread.dto';
import { Thread } from './entities/thread.entity';
import { Message } from '../message/entities/message.entity';
import { In, Repository } from 'typeorm';

@Injectable()
export class ThreadService {
  private readonly logger = new Logger(ThreadService.name);

  constructor(
    @InjectRepository(Thread)
    private readonly threadRepository: Repository<Thread>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
  ) {}

  create(createThreadDto: CreateThreadDto) {
    return 'This action adds a new thread';
  }

  findAll() {
    return `This action returns all thread`;
  }

  findOne(id: number) {
    return `This action returns a #${id} thread`;
  }

  update(id: number, updateThreadDto: UpdateThreadDto) {
    return `This action updates a #${id} thread`;
  }

  remove(id: number) {
    return `This action removes a #${id} thread`;
  }

  async findAllMessages(threadId: number): Promise<Message[]> {
    return this.messageRepository.find({
      where: { thread: { id: threadId } },
      relations: ['thread'],
    });
  }

  async addMessage(threadId: number, content: any): Promise<Message> {
    let thread: Thread;
    try {
      // Correct way to pass the ID to findOneOrFail
      thread = await this.threadRepository.findOneOrFail({
        where: { id: threadId },
      });
    } catch (error) {
      // Handle the case where the thread doesn't exist
      throw new NotFoundException(`Thread with ID ${threadId} not found.`);
    }

    const message = new Message();
    message.thread = thread;
    message.content = content;

    return this.messageRepository.save(message);
  }

  async findMessagesByRole(
    threadId: number,
    roles: string[],
  ): Promise<Message[]> {
    try {
      return this.messageRepository.find({
        where: {
          thread: { id: threadId },
          content: { role: In(roles) }, // Filter by role
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
          content: { role: 'user' }, // Count messages with role 'user'
        },
      });
    } catch (error) {
      this.logger.error(`Failed to count user messages: ${error.message}`);
      throw error;
    }
  }
}
