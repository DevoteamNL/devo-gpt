import { Test, TestingModule } from '@nestjs/testing';
import { ExtendedLoggerService } from './extended-logger.service';

describe('ExtendedLoggerService', () => {
  let service: ExtendedLoggerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ExtendedLoggerService],
    }).compile();

    service = module.get<ExtendedLoggerService>(ExtendedLoggerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
