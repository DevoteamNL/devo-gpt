import { Controller, Get, Logger, Post, Request } from '@nestjs/common';
import { CognitiveSearchService } from '../cognitive-search/cognitive-search.service';
import { OpenaiService } from '../openai/openai.service';

@Controller('chat')
export class ChatController {
  private readonly logger = new Logger(ChatController.name);

  //constructor
  constructor(
    private readonly cognitiveSearchService: CognitiveSearchService,
    private readonly openaiService: OpenaiService,
  ) {}

  // Following method Post controller endpoint
  // calls cognitive search service to retrive documents based on query passed in request body
  // send it to openai service as context and retunrs response
  @Post()
  async postChat(@Request() req) {
    const chatMessage = req.body.message.text;
    const senderName = req.body.message.sender.displayName;
    // log chat message
    this.logger.log(`From ${senderName}, Chat message: ${chatMessage}`);

    const contextGPT = await this.cognitiveSearchService.doSemanticHybridSearch(
      chatMessage,
    );
    const chatGPTResponse = await this.openaiService.getChatResponse(
      contextGPT,
      senderName,
      chatMessage,
    );
    // log chat response
    this.logger.log(`Chat response: ${chatGPTResponse.content}`);
    return { text: chatGPTResponse.content };
  }
}
