import { Controller, Get, Logger, Post, Request } from '@nestjs/common';
import { CognitiveSearchService } from '../cognitive-search/cognitive-search.service';
import { OpenaiService } from '../openai/openai.service';
import { JoanDeskService } from '../integrations/joan-desk/joan-desk.service';
import { ChatService } from './chat.service';

@Controller('chat')
export class ChatController {
  private readonly logger = new Logger(ChatController.name);

  //constructor
  constructor(
    private readonly chatService: ChatService,
    private readonly cognitiveSearchService: CognitiveSearchService,
    private readonly openaiService: OpenaiService,
    private readonly joanDeskService: JoanDeskService,
  ) {}

  // Following method Post controller endpoint
  // calls cognitive search service to retrive documents based on query passed in request body
  // send it to openai service as context and retunrs response
  @Post()
  async postChat(@Request() req) {
    const chatMessage = req.body.message.text;
    const senderName = req.body.message.sender.displayName;

    // log Name, Chat_message, Sender_email that can be parsed in Azure log analytics
    this.logger.log(
      `NAME:${senderName}, CHAT_MESSAGE:${chatMessage}, SENDER_EMAIL:${req.body.message.sender.email}`,
    );

    const chatGPTResponse = await this.openaiService.getChatResponse(
      senderName,
      chatMessage,
    );
    // log chat response
    return { text: chatGPTResponse.content };
  }

  @Post('langchain')
  async postLangchain(@Request() req) {
    return this.chatService.chat(req.body.message.text);
  }

  @Get('joan-desk')
  async getDeskDetails() {
    return this.joanDeskService.getMe('/api/2.0/portal/me/');
  }
}
