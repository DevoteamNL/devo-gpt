import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Thread } from '../../thread/entities/thread.entity';

@Entity()
export class Message {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Thread, (thread) => thread.id)
  thread: Thread;

  @Column('json')
  data: any; // JSON content of the message
}
