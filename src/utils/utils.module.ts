import { Module } from '@nestjs/common';
import { DateParserService } from './date-parser/date-parser.service';
import { ExtendedLoggerService } from './extended-logger/extended-logger.service';

@Module({
  providers: [DateParserService, ExtendedLoggerService],
  exports: [DateParserService],
})
export class UtilsModule {}
