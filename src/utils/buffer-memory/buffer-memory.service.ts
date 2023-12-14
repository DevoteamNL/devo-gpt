import { Injectable, Logger } from '@nestjs/common';
import { ChatMessage } from '@azure/openai';
import { SchedulerRegistry } from '@nestjs/schedule';
import { FunctionDefinition } from '@azure/openai/types/src';

@Injectable()
export class BufferMemoryService {
  private buffer: Map<string, ChatMessage[]> = new Map();
  private readonly expiryTime: number = 10 * 60 * 60 * 1000; // 10 hours in milliseconds
  private readonly logger = new Logger(BufferMemoryService.name);

  constructor(private schedulerRegistry: SchedulerRegistry) {
    this.logger.log('BufferMemoryService initialized');
  }

  private setExpiry(key: string): void {
    this.clearExpiry(key); // Clear existing expiry before setting a new one

    this.logger.log(`Setting expiry for key: ${key}`);
    const timeout = setTimeout(() => {
      this.logger.log(`Expiring key: ${key}`);
      this.buffer.delete(key);
      this.schedulerRegistry.deleteTimeout(key);
      this.logger.log(`Key ${key} has been deleted from the buffer`);
    }, this.expiryTime);
    this.schedulerRegistry.addTimeout(key, timeout);
  }

  private clearExpiry(key: string): void {
    if (this.schedulerRegistry.doesExist('timeout', key)) {
      this.schedulerRegistry.deleteTimeout(key);
      this.logger.log(`Existing expiry for key ${key} has been cleared`);
    }
  }

  deleteBufferEntry(email: string): void {
    this.logger.log(`Deleting buffer entry for email: ${email}`);
    this.buffer.delete(email);
    if (this.schedulerRegistry.doesExist('timeout', email)) {
      this.schedulerRegistry.deleteTimeout(email);
      this.logger.log(`Timeout deleted for email: ${email}`);
    }
  }

  private checkAndClearBufferIfFull(email: string): void {
    const messages = this.buffer.get(email);

    const userMessageCount =
      messages?.filter((message) => message.role === 'user').length || 0;

    if (userMessageCount >= 10) {
      this.logger.log(`Buffer limit reached for email: ${email}.`);
      this.deleteBufferEntry(email); // Reusing deleteBufferEntry function
      this.logger.log(`Buffer entry deleted for email: ${email}`);
    }
  }

  addMessage(email: string, message: ChatMessage): void {
    this.logger.log(`Adding message for email: ${email}`);
    const messages = this.buffer.get(email) || [];
    messages.push(message);
    this.buffer.set(email, messages);
    this.setExpiry(email); // Refresh the expiry
    this.checkAndClearBufferIfFull(email); // Check if the buffer is full and clear it if necessary
    this.logger.log(
      `Message added for email: ${email}. Total messages count: ${this.getUserMessageCount(
        email,
      )}`,
    );
  }

  addMessages(email: string, messagesToAdd: ChatMessage[]): void {
    this.logger.log(`Adding multiple messages for email: ${email}`);
    const messages = this.buffer.get(email) || [];
    messages.push(...messagesToAdd);
    this.buffer.set(email, messages);
    this.setExpiry(email); // Refresh the expiry
    this.checkAndClearBufferIfFull(email); // Check if the buffer is full and clear it if necessary
    this.logger.log(
      `Multiple messages added for email: ${email}. Total messages count: ${this.getUserMessageCount(
        email,
      )}`,
    );
  }

  getMessages(email: string): ChatMessage[] {
    this.logger.log(`Retrieving messages for email: ${email}`);
    const messages = this.buffer.get(email) || [];
    this.setExpiry(email); // Refresh the expiry
    this.logger.log(
      `Messages retrieved for email: ${email}. Total messages count: ${this.getUserMessageCount(
        email,
      )}`,
    );
    return messages;
  }

  getUserMessageCount(email: string): number {
    this.logger.log(`Counting user messages for email: ${email}`);
    const messages = this.buffer.get(email) || [];
    const userMessageCount = messages.filter(
      (message) => message.role === 'user',
    ).length;
    this.logger.log(
      `User message count for email ${email}: ${userMessageCount}`,
    );
    return userMessageCount;
  }

  public getFunctionDefinitions() {
    return [this.clearChatHistoryFunctionDefinition()];
  }

  private clearChatHistoryFunctionDefinition(): FunctionDefinition {
    return {
      name: 'clearChatHistory',
      description:
        'Clear the chat history for a given user based on their email address. Clears chat history, Starts new session. Clear sessions. Starts new topic',
      parameters: {
        type: 'object',
        properties: {},
      },
    };
  }
}
