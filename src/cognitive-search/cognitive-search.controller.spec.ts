import { Test, TestingModule } from '@nestjs/testing';
import { CognitiveSearchController } from './cognitive-search.controller';

describe('CognitiveSearchController', () => {
  let controller: CognitiveSearchController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CognitiveSearchController],
    }).compile();

    controller = module.get<CognitiveSearchController>(CognitiveSearchController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
