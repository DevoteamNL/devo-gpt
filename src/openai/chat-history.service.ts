import { Injectable } from '@nestjs/common';
import { ChatMessage } from '@azure/openai';
import { MessageService } from '../message/message.service';

@Injectable()
export class ChatHistoryService {
  private chatHistories = new Map<string, ChatMessage[]>();

  constructor(private messageService: MessageService) {}

  async initChatHistory(threadId: string): Promise<ChatMessage[]> {
    if (!this.chatHistories.has(threadId)) {
      const history = await this.messageService.findAllMessagesByThreadId(
        +threadId,
      );
      this.chatHistories.set(threadId, history);
    }
    return this.chatHistories.get(threadId);
  }

  async addMessage(threadId: string, message: ChatMessage): Promise<void> {
    // Retrieve the current chat history for the thread
    const history = this.chatHistories.get(threadId) || [];

    // Update the local chat history
    history.push(message);

    // Update the message service
    await this.messageService.create({
      threadId: +threadId,
      data: message,
    });

    // If the chat history for this thread was not previously tracked, start tracking it
    if (!this.chatHistories.has(threadId)) {
      this.chatHistories.set(threadId, history);
    }
  }

  addSystemMessage(threadId: string, systemMessage: ChatMessage): void {
    const history = this.chatHistories.get(threadId) || [];
    history.unshift(systemMessage); // Prepend system message to the chat history

    if (!this.chatHistories.has(threadId)) {
      this.chatHistories.set(threadId, history);
    }
  }

  async refreshChatHistory(threadId: string): Promise<void> {
    const updatedHistory = await this.messageService.findAllMessagesByThreadId(
      +threadId,
    );
    this.chatHistories.set(threadId, updatedHistory);
  }

  getChatHistory(threadId: string): ChatMessage[] {
    return this.chatHistories.get(threadId) || [];
  }
}
