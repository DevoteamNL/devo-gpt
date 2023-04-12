import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);
  getHello(): string {
    console.log('this is log');
    this.logger.log('Inside getHello');
    return 'Hello World!';
  }
}
