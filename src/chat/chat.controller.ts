import { Controller, Delete, Get, Logger, Post, Request } from '@nestjs/common';
import { CognitiveSearchService } from '../cognitive-search/cognitive-search.service';
import { OpenaiService } from '../openai/openai.service';
import { JoanDeskService } from '../integrations/joan-desk/joan-desk.service';
import { ChatService } from './chat.service';
import { BufferMemoryService } from '../utils/buffer-memory/buffer-memory.service';

@Controller('chat')
export class ChatController {
  private readonly logger: Logger = new Logger(ChatController.name);

  //constructor
  constructor(
    private readonly chatService: ChatService,
    private readonly openaiService: OpenaiService,
    private readonly joanDeskService: JoanDeskService,
    private readonly bufferMemoryService: BufferMemoryService,
  ) {}

  // Following method delete controller endpoint
  // deletes messages from buffer memory
  @Delete()
  async deleteChat(@Request() req) {
    const senderEmail = req.body.message.sender.email;
    const messageDeleteCnt =
      this.bufferMemoryService.getUserMessageCount(senderEmail);
    this.bufferMemoryService.deleteBufferEntry(senderEmail);
    return 'Chat deleted, message count ' + messageDeleteCnt;
  }

  // Following method Post controller endpoint
  // calls cognitive search service to retrive documents based on query passed in request body
  // send it to openai service as context and retunrs response
  @Post()
  async postChat(@Request() req) {
    const chatMessage = req.body.message.text;
    const senderName = req.body.message.sender.displayName;
    const senderEmail = req.body.message.sender.email;

    // log Name, Chat_message, Sender_email that can be parsed in Azure log analytics
    this.logger.log(
      `NAME:${senderName}, CHAT_MESSAGE:${chatMessage}, SENDER_EMAIL: ${senderEmail}`,
    );
    const chatGPTResponse = await this.openaiService.getChatResponse(
      senderName,
      senderEmail,
      chatMessage,
    );
    const userMessageCount =
      this.bufferMemoryService.getUserMessageCount(senderEmail);
    let chatResponse = '';
    if (userMessageCount == 0 || userMessageCount >= 10) {
      chatResponse =
        '\n\n*WARNING! NEW SESSION* WILL START With your next message\nAll Previous chat history will be ignored.';
    } else {
      chatResponse = `\n\n*${userMessageCount}* of 10.`;
    }
    // log chat response
    return { text: chatGPTResponse.content + chatResponse };
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
