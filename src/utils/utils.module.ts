import { Module } from '@nestjs/common';
import { DateParserService } from './date-parser/date-parser.service';

@Module({
  providers: [DateParserService],
  exports: [DateParserService],
})
export class UtilsModule {}
