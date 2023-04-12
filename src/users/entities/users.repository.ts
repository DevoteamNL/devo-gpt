import { EntityRepository } from '@mikro-orm/mysql';
import { User } from './user.entity';

export class UsersRepository extends EntityRepository<User> {}
