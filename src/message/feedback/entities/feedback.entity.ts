import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Message } from '../../entities/message.entity';
import { User } from '../../../users/entities/user.entity';
export enum FeedbackRating {
  ANGRY = 1,
  SAD = 2,
  NEUTRAL = 3,
  GOOD = 4,
  VERY_GOOD = 5,
}
@Entity()
export class Feedback {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('text')
  text: string; // The actual feedback text

  @ManyToOne(() => Message, (message) => message.feedbacks)
  message: Message;

  @ManyToOne(() => User, (user) => user.feedbacks)
  user: User;

  @Column({
    type: 'enum',
    enum: FeedbackRating,
    default: FeedbackRating.NEUTRAL,
  })
  rating: FeedbackRating;

  // column that stores date and time of feedback automatically
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
