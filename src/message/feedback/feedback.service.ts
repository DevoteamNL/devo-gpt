import { Injectable, Logger } from '@nestjs/common';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { UpdateFeedbackDto } from './dto/update-feedback.dto';
import { Feedback } from './entities/feedback.entity';
import { Message } from '../entities/message.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class FeedbackService {
  private logger: Logger = new Logger('FeedbackService');
  constructor(
    @InjectRepository(Feedback)
    private readonly feedbackRepository: Repository<Feedback>,
  ) {}

  async create(
    messageId: number,
    createFeedbackDto: CreateFeedbackDto,
  ): Promise<Feedback> {
    const feedback = new Feedback();
    feedback.message = { id: messageId } as Message;
    feedback.text = createFeedbackDto.text;
    feedback.rating = createFeedbackDto.rating;
    feedback.user = createFeedbackDto.user;

    return this.feedbackRepository.save(feedback);
  }

  findAll() {
    return `This action returns all feedback`;
  }

  findOne(id: number) {
    return this.feedbackRepository.findOne({
      where: { id },
      relations: ['message'],
    });
  }

  update(id: number, updateFeedbackDto: UpdateFeedbackDto) {
    return `This action updates a #${id} feedback`;
  }

  remove(id: number) {
    return `This action removes a #${id} feedback`;
  }
}
