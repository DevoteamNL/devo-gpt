import { Controller, Delete, Get, Logger, Post, Request } from '@nestjs/common';
import { OpenaiService } from '../openai/openai.service';
import { JoanDeskService } from '../integrations/joan-desk/joan-desk.service';
import { ChatService } from './chat.service';
import { BufferMemoryService } from '../utils/buffer-memory/buffer-memory.service';

@Controller('chat')
export class ChatController {
  private readonly logger: Logger = new Logger(ChatController.name);

  constructor(
    private readonly chatService: ChatService,
    private readonly openaiService: OpenaiService,
    private readonly joanDeskService: JoanDeskService,
    private readonly bufferMemoryService: BufferMemoryService,
  ) {}

  @Post()
  /**
   * Handles the POST request for chat messages.
   * @param req - The request object containing the chat message.
   * @returns An object containing the chat response.
   */
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
    let chatResponse: string;
    if (userMessageCount == 0 || userMessageCount >= 10) {
      chatResponse =
        '\n\n*WARNING! NEW SESSION* WILL START With your next message\nAll Previous chat history will be ignored.';
    } else {
      chatResponse = `\n\n*${userMessageCount}* of 10.`;
    }
    // log chat response
    return { text: chatGPTResponse.content + chatResponse };
  }

  /**
   * Deletes a chat and returns the message count of the deleted chat.
   * @param req - The request object containing the chat information.
   * @returns A string indicating that the chat has been deleted and the message count of the deleted chat.
   */
  @Delete()
  async deleteChat(@Request() req) {
    const senderEmail = req.body.message.sender.email;
    const messageDeleteCnt =
      this.bufferMemoryService.getUserMessageCount(senderEmail);
    this.bufferMemoryService.deleteBufferEntry(senderEmail);
    return 'Chat deleted, message count ' + messageDeleteCnt;
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
