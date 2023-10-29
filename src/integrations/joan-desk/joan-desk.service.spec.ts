import { Test, TestingModule } from '@nestjs/testing';
import { JoanDeskService } from './joan-desk.service';

describe('JoanDeskService', () => {
  let service: JoanDeskService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [JoanDeskService],
    }).compile();

    service = module.get<JoanDeskService>(JoanDeskService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
