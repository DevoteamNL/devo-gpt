import {
  Controller,
  Get,
  UseGuards,
  Request,
  Post,
  Logger,
} from '@nestjs/common';
import { AppService } from './app.service';
import { JwtAuthGuard } from './auth/jwt/jwt-auth.guard';
import { SheetsService } from './sheets/sheets.service';
import { OpenaiService } from './openai/openai.service';

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(
    private readonly appService: AppService,
    private readonly sheetsService: SheetsService,
    private readonly openaiService: OpenaiService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('chat')
  async postChat(@Request() req) {
    this.logger.log(req.body);
    const contextGPT = await this.sheetsService.setContextGPT();
    this.logger.log(`CONTEXT: ${contextGPT}`);
    const userMessageAndContext = contextGPT + req.body.message.text;
    this.logger.log(`MESSAGE to be Sent: : ${userMessageAndContext}`);
    const chatGPTResponse = await this.openaiService.getChatResponse(
      userMessageAndContext,
    );
    this.logger.log(chatGPTResponse);

    return { text: chatGPTResponse.content };
  }

  @UseGuards(JwtAuthGuard)
  @Get('sheets')
  getSheets(@Request() req): Promise<any> {
    return this.sheetsService.getContent(req.user.id, 5, 0);
  }

  @UseGuards(JwtAuthGuard)
  @Get('private')
  getPrivate(@Request() req) {
    return req.user;
  }
}
