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
import { OpenaiService } from './openai/openai.service';
import { GoogledriveService } from './googledrive/googledrive.service';

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(
    private readonly appService: AppService,
    private readonly openaiService: OpenaiService,
    private readonly googledriveService: GoogledriveService,
  ) {}

  @Get()
  getHello(): string {
    this.logger.log('Hello World!');
    return this.appService.getHello();
  }

  // @Post('chat')
  // async postChat(@Request() req) {
  //   this.logger.log(req.body);
  //   const contextGPT = await this.sheetsService.setContextGPT();
  //   this.logger.log(`CONTEXT: ${contextGPT}`);
  //   const userMessageAndContext = contextGPT + req.body.message.text;
  //   this.logger.log(`MESSAGE to be Sent: : ${userMessageAndContext}`);
  //   const chatGPTResponse = await this.openaiService.getChatResponse(
  //     userMessageAndContext,
  //   );
  //   this.logger.log(chatGPTResponse);
  //
  //   return { text: chatGPTResponse.content };
  // }

  @UseGuards(JwtAuthGuard)
  @Post('upload')
  uploadURL(@Request() req): Promise<string> {
    console.log('Inside upload');
    return this.googledriveService.uploadURL(
      req.body.google_drive_url,
      'hardik.patel@devoteam.com',
    );
  }

  @Post('search')
  getQuery(@Request() req) {
    return this.googledriveService.searchresponse(req.body.query);
  }

  @UseGuards(JwtAuthGuard)
  @Get('private')
  getPrivate(@Request() req) {
    return req.user;
  }
}
