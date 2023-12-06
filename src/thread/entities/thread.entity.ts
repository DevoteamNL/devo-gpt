import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  Column,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Message } from '../../message/entities/message.entity';

@Entity()
export class Thread {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  title: string;

  @ManyToOne(() => User, (user) => user.threads)
  user: User;

  // TODO: Add lazy loading to the messages property
  @OneToMany(() => Message, (message) => message.thread)
  messages: Message[];
}
