import { Test, TestingModule } from '@nestjs/testing';
import { BufferMemoryService } from './buffer-memory.service';

describe('BufferMemoryService', () => {
  let service: BufferMemoryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BufferMemoryService],
    }).compile();

    service = module.get<BufferMemoryService>(BufferMemoryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
