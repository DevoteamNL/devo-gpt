import { Entity, PrimaryGeneratedColumn, ManyToOne, OneToMany } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Message } from '../../message/entities/message.entity';

@Entity()
export class Thread {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.threads)
  user: User;

  @OneToMany(() => Message, (message) => message.thread)
  messages: Message[];
}
