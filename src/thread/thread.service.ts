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
import { MessageService } from '../message/message.service';

@Injectable()
export class ThreadService {
  private readonly logger = new Logger(ThreadService.name);

  constructor(
    @InjectRepository(Thread)
    private readonly threadRepository: Repository<Thread>,
    private readonly messageService: MessageService,
  ) {}

  /**
   * Creates a new thread along with its first message.
   * @param createThreadDto DTO for creating a thread.
   * @returns The created thread with its messages.
   */
  async create(createThreadDto: CreateThreadDto): Promise<Thread> {
    try {
      const thread = this.threadRepository.create({
        title: createThreadDto.title,
        user: createThreadDto.user,
        plugin: createThreadDto.plugin,
      });
      const savedThread = await this.threadRepository.save(thread);

      await this.messageService.create({
        threadId: thread.id,
        data: {
          role: 'user',
          content: createThreadDto.message,
        },
      });

      return await this.threadRepository.findOne({
        where: { id: savedThread.id },
        relations: ['messages'],
      });
    } catch (error) {
      this.logger.error(`Failed to create thread: ${error.message}`);
      throw new InternalServerErrorException(
        `Failed to create thread: ${error.message}`,
      );
    }
  }

  /**
   * Retrieves all threads.
   * @returns A list of all threads.
   */
  async findAll(): Promise<Thread[]> {
    return await this.threadRepository.find({ relations: ['messages'] });
  }

  async findAllByUser(userId: number): Promise<Thread[]> {
    return await this.threadRepository
      .createQueryBuilder('thread')
      .leftJoinAndSelect('thread.messages', 'message')
      .where('thread.user.id = :userId', { userId })
      .andWhere("message.data ->> 'role' IN (:...roles)", {
        roles: ['user', 'assistant'],
      })
      .andWhere("message.data ->> 'content' != ''")
      .orderBy('thread.id', 'DESC')
      .addOrderBy('message.id', 'ASC')
      .getMany();
  }

  /**
   * Retrieves a single thread by its ID.
   * @param id The ID of the thread.
   * @returns The requested thread, if found.
   */
  async findOne(id: number): Promise<Thread> {
    const thread = await this.threadRepository.findOne({
      where: { id },
      relations: ['messages'],
    });

    if (!thread) {
      throw new NotFoundException(`Thread with ID ${id} not found.`);
    }

    return thread;
  }

  /**
   * Updates a thread.
   * @param id The ID of the thread to update.
   * @param updateThreadDto DTO for updating a thread.
   * @returns The updated thread.
   */
  async update(id: number, updateThreadDto: UpdateThreadDto): Promise<Thread> {
    await this.threadRepository.update(id, {
      title: updateThreadDto.title,
    });
    return await this.findOne(id);
  }

  /**
   * Removes a thread by its ID.
   * @param id The ID of the thread to remove.
   * @returns A confirmation message.
   */
  async remove(id: number): Promise<string> {
    await this.threadRepository.softDelete(id);
    return 'OK';
  }
}
