import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  Column,
  DeleteDateColumn,
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

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;

  @Column({ nullable: true })
  plugin: string;
}
