import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { Thread } from '../../thread/entities/thread.entity';
import { Feedback } from '../feedback/entities/feedback.entity';

@Entity()
export class Message {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Thread, (thread) => thread.id)
  thread: Thread;

  @Column('jsonb')
  data: any; // JSON content of the message

  @OneToMany(() => Feedback, (feedback) => feedback.message)
  feedbacks: Feedback[];

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
