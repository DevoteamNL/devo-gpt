import { IsEnum } from 'class-validator';
import { FeedbackRating } from '../entities/feedback.entity';
import { User } from '../../../users/entities/user.entity';

export class CreateFeedbackDto {
  text: string; // The text content of the feedback
  user: User;
  @IsEnum(FeedbackRating)
  rating: FeedbackRating; // The rating for the feedback, using the FeedbackRating enum
}
