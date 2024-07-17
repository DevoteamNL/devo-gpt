import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  Unique,
} from 'typeorm';
import { IsEmail } from 'class-validator';
import { Thread } from '../../thread/entities/thread.entity';
import { Feedback } from '../../message/feedback/entities/feedback.entity';
import { PluginDisplayNameT } from '../../plugin/plugin.constants';

@Entity()
@Unique('UQ_USERNAME_PROVIDER', ['username', 'providerId'])
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

  @Column() //{ select: false }
  google_token: string;

  @Column({ nullable: true })
  refresh_token: string;

  // TODO: Add lazy loading to the threads property
  @OneToMany(() => Thread, (thread) => thread.user)
  threads: Thread[];

  // TODO: Add lazy loading to the threads property
  @OneToMany(() => Feedback, (feedback) => feedback.user)
  feedbacks: Feedback[];

  // Enable or disable access
  @Column({ default: true })
  is_active: boolean;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  // Whitelist of the plugins' names the user is permitted to access
  @Column({
    type: 'varchar',
    array: true,
    nullable: true,
  })
  plugins: PluginDisplayNameT[];

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
    const { id, username, providerId, plugins } = this;
    return { id, username, providerId, plugins };
  }
}

interface UserDTO {
  id: number;
  username: string;
  providerId: string;
  plugins: PluginDisplayNameT[];
}
