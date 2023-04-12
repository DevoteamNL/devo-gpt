import { IsEmail } from 'class-validator';
import {
  Entity,
  EntityDTO,
  EntityRepositoryType,
  PrimaryKey,
  Property,
  wrap,
} from '@mikro-orm/core';
import { UsersRepository } from './users.repository';

@Entity({ customRepository: () => UsersRepository })
export class User {
  [EntityRepositoryType]?: UsersRepository;

  @PrimaryKey()
  id: number;

  @Property()
  @IsEmail()
  username: string;

  @Property({ nullable: false })
  providerId: string;

  @Property({ hidden: true })
  google_token: string;
  @Property({ hidden: true, nullable: true })
  refresh_token: string;

  constructor(
    providerId: string,
    username: string,
    google_token: string,
    refresh_token: string,
  ) {
    this.username = username;
    this.providerId = providerId;
    this.google_token = google_token;
    this.refresh_token = refresh_token;
  }

  toJSON(user?: User) {
    return wrap<User>(this).toObject() as UserDTO;
  }
}

type UserDTO = EntityDTO<User>;
