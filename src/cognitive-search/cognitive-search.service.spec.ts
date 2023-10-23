import { Test, TestingModule } from '@nestjs/testing';
import { CognitiveSearchService } from './cognitive-search.service';

describe('CognitiveSearchService', () => {
  let service: CognitiveSearchService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CognitiveSearchService],
    }).compile();

    service = module.get<CognitiveSearchService>(CognitiveSearchService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
