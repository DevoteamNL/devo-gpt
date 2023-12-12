import { User } from '../../users/entities/user.entity';

export class CreateThreadDto {
  title: string;
  user: User;
  message: string;
}
