import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { IsEmail } from 'class-validator';

@Entity() // Use the Entity decorator
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @IsEmail()
  username: string;

  @Column()
  providerId: string;

  @Column({ select: true }) // Use select: false to hide the field in query results
  google_token: string;

  @Column({ select: true, nullable: true })
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

  // If you need to transform the entity to JSON, you can create a method like this:
  toJSON(): UserDTO {
    const { id, username, providerId } = this;
    return { id, username, providerId };
  }
}

// Define a DTO (Data Transfer Object) for your User entity
interface UserDTO {
  id: number;
  username: string;
  providerId: string;
}
