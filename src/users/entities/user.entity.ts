import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { IsEmail } from 'class-validator';
import { Thread } from '../../thread/entities/thread.entity';

@Entity() // Use the Entity decorator
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @IsEmail()
  username: string;

  @Column()
  name: string;

  @Column()
  providerId: string;

  @Column({ select: false })
  google_token: string;

  @Column({ select: false, nullable: true })
  refresh_token: string;

  // TODO: Add lazy loading to the threads property
  @OneToMany(() => Thread, (thread) => thread.user)
  threads: Thread[];

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

  toJSON(): UserDTO {
    const { id, username, providerId } = this;
    return { id, username, providerId };
  }
}

interface UserDTO {
  id: number;
  username: string;
  providerId: string;
}
