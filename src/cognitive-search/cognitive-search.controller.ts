import { Controller, Get, Request } from '@nestjs/common';
import { CognitiveSearchService } from './cognitive-search.service';

@Controller('cognitive-search')
export class CognitiveSearchController {
  constructor(
    private readonly cognitiveSearchService: CognitiveSearchService,
  ) {}

  @Get('search')
  getQuery(@Request() req) {
    return this.cognitiveSearchService.getDocumentsByFileIds([
      '1mMPpGcrQrw2gAhngpKAGqVibmZct2q38',
    ]);
  }
}
