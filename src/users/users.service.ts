import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm'; // Import InjectRepository
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { Thread } from '../thread/entities/thread.entity'; // Import Repository

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>, // Use Repository<User>
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    try {
      const user = this.usersRepository.create(createUserDto);
      await this.usersRepository.save(user);
      return user;
    } catch (error) {
      if (error.code === '23505') {
        const existingUser = await this.findByProviderId(
          createUserDto.providerId,
        );
        if (existingUser) {
          return existingUser;
        }
        throw new Error('User already exists with this provider ID');
      }
      this.logger.error(`Failed to create user: ${error.message}`);
      throw error;
    }
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.find();
  }

  async findOne(id: number): Promise<User | undefined> {
    return this.usersRepository.findOneBy({ id });
  }

  async findByProviderId(providerId: string): Promise<User | undefined> {
    return this.usersRepository.findOne({ where: { providerId } });
  }

  async findByUsername(username: string): Promise<User | undefined> {
    return this.usersRepository.findOne({ where: { username } });
  }

  async update(
    id: number,
    updateUserDto: UpdateUserDto,
  ): Promise<User | undefined> {
    const user = await this.usersRepository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    user.google_token = updateUserDto.google_token;
    user.refresh_token = updateUserDto.refresh_token;

    await this.usersRepository.save(user);
    return user;
  }

  async remove(id: number): Promise<void> {
    const user = await this.usersRepository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    await this.usersRepository.remove(user);
  }

  // Find last 10 threads for a user

  // async findLastTenThreads(userId: number): Promise<Thread[]> {
  //   try {
  //     const user = await this.usersRepository.findOneOrFail({ where: { id: userId } });
  //     return this.threadRepository.find({
  //       where: { user: user },
  //       order: {
  //         createdAt: 'DESC', // Or use 'id' if you don't have a 'createdAt' column
  //       },
  //       take: 10, // Limit the result to 10 threads
  //     });
  //   } catch (error) {
  //     this.logger.error(`Failed to find last 10 threads for user ${userId}: ${error.message}`);
  //     throw error;
  //   }
  // }
}
