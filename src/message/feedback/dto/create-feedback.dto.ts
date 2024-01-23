import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { FeedbackRating } from '../entities/feedback.entity';

export class CreateFeedbackDto {
  @IsNotEmpty()
  @IsString()
  text: string; // The text content of the feedback

  @IsEnum(FeedbackRating)
  rating: FeedbackRating; // The rating for the feedback, using the FeedbackRating enum
}
