import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import { UsersRepository } from './entities/users.repository';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}
  async create(createUserDto: CreateUserDto) {
    console.log('TESt');
    const res = this.usersRepository.create(createUserDto);
    await this.usersRepository.flush();
    return res;
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.findAll();
  }

  findOne(id) {
    return this.usersRepository.findOne(id);
  }

  async findByProviderId(providerId: string) {
    return await this.usersRepository.findOne({
      providerId: providerId,
    });
  }

  async findByUsername(username: string) {
    return await this.usersRepository.findOne({
      username: username,
    });
  }

  async update(updateUserDto: UpdateUserDto) {
    return this.usersRepository.upsert(updateUserDto);
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }
}
