import { Module } from '@nestjs/common';
import { DateParserService } from './date-parser/date-parser.service';
import { ExtendedLoggerService } from './extended-logger/extended-logger.service';
import { BufferMemoryService } from './buffer-memory/buffer-memory.service';

@Module({
  providers: [DateParserService, ExtendedLoggerService, BufferMemoryService],
  exports: [DateParserService, BufferMemoryService],
})
export class UtilsModule {
}
