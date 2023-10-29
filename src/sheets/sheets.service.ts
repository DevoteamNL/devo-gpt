import { Injectable, Logger } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { ConfigService } from '@nestjs/config';
import { google, sheets_v4 } from 'googleapis';
import { CommunicationsService } from '../communications/communications.service';
// import { Cron } from '@nestjs/schedule';
import { GoogleOauth2ClientService } from '../auth/GoogleOauth2Client.service';
import keys from '../config/devoteamnl-park-app.json';
import { OpenaiService } from '../openai/openai.service';
import { DateParserService } from '../utils/date-parser/date-parser.service';

@Injectable()
export class SheetsService {
  private readonly logger = new Logger(SheetsService.name);
  private readonly oAuth2Client;
  private readonly oauthSAClient;

  constructor(
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
    private readonly communicationsService: CommunicationsService,
    private readonly googleOauth2ClientService: GoogleOauth2ClientService,
    // private readonly openaiService: OpenaiService,
    private readonly dateParserService: DateParserService,
  ) {
    this.oAuth2Client = this.googleOauth2ClientService.getOauth2Client();
    this.oauthSAClient = new google.auth.JWT(
      keys.client_email,
      null,
      keys.private_key,
      ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    );
  }

  // @Cron('0 9 * * 1-5') // Runs daily at 10 AM, on work week
  //@Cron('45 * * * * *') // Runs every 45th seconf of a minute
  async _cronUpdateVectorDB() {
    this.logger.log('Updating vector DB');
    const spreadSheetContents: SpreadSheetContents[] = await this.getContent(
      await this.retrieveGCPUserId(),
      10,
      0,
    );
    for (const spreadSheetContent of spreadSheetContents) {
      this.logger.log(
        `Updating vector DB for day: ${
          spreadSheetContent.day
        }, emails: ${spreadSheetContent.emails.toString()}`,
      );
      const dateToText = this.dateParserService.convertDateToText(
        spreadSheetContent.day,
      );
      const text_to_embed: string = `${dateToText} ${
        spreadSheetContent.day
      }: ${spreadSheetContent.emails.join(',')}`;

      this.logger.log('Following Text needs to be embedded:');
      this.logger.log(text_to_embed);
      // const embeddings = await this.openaiService.generateEmbedding(
      //   text_to_embed,
      // );
      // await this.milvusParkingDataService.insertSheetTextAndEmbedding(
      //   text_to_embed,
      //   embeddings,
      // );
      // await this.pineconeService.listIndexes();
      // await this.pineconeService.upsertRecords({
      //   vectors: [
      //     {
      //       id: 'vec1',
      //       values: embeddings,
      //       metadata: {
      //         text: text_to_embed,
      //       },
      //     },
      //   ],
      //   namespace: 'example-namespace',
      // });
      // const quer_embedding = await this.openaiService.generateEmbedding(
      //   '09/05',
      // );
      // await this.pineconeService.queryRecords(quer_embedding);

      // this.milvusParkingDataService.insertSheetTextAndEmbedding(
      //this.milvusParkingDataService.insertSheetTextAndEmbedding()
    }
  }

  //@Cron('0 9 * * 1-5') // Runs daily at 10 AM, on work week
  // @Cron('45 * * * * *') // Runs every 45th seconf of a minute
  async _cronEmailNotification() {
    const spreadSheetContents: SpreadSheetContents[] = await this.getContent(
      await this.retrieveGCPUserId(),
      1,
      1,
    );
    for (const spreadSheetContent of spreadSheetContents) {
      this.logger.log(`Sending Email for day: ${spreadSheetContent.day}`);
      this.logger.log(
        `Sending Emails to following:${spreadSheetContent.emails.toString()}`,
      );
      spreadSheetContent.emails.forEach((email) => {
        if (
          email !== undefined &&
          email.endsWith('@' + this.configService.get('EMAIL_DOMAIN'))
        ) {
          this.communicationsService.sendEmail(this.oauthSAClient, email);
        }
      });
    }
    return spreadSheetContents;
  }

  // Internal Function that run every day 8AM to refreshAccessToken
  //@Cron('45 * * * *') // Runs daily at 8 AM
  async _cronRefreshAccessToken() {
    const id = await this.retrieveGCPUserId();
    this.logger.log(`Geting user information for user id: ${id}`);
    const user = await this.usersService.findOne(id);

    this.oAuth2Client.setCredentials({
      access_token: user.google_token,
      refresh_token: user.refresh_token,
    });
    this.logger.log('Refreshing access token');
    await this.oAuth2Client.refreshAccessToken();
    this.logger.log('Access token refreshed');
  }

  // Function that return next work days in format 'dd-mm',
  // that has two paramter: 'no_of_days' and 'start_day' as number
  // getNextFewWorkDays(10,0) return next 10 work days from today
  // getNextFewWorkDays(10,-1) return next 10 work days from yesterday
  // getNextFewWorkDays(10,1) return next 10 work days from tomorrow
  getNextFewWorkDays(no_of_days: number, start_day: number) {
    const work_days = [];
    const today = new Date();
    today.setDate(today.getDate() + start_day);
    let count = 0;
    while (count < no_of_days) {
      if (today.getDay() !== 0 && today.getDay() !== 6) {
        let day: string | number = today.getDate();
        let month: string | number = today.getMonth() + 1;
        if (day < 10) day = '0' + day;
        if (month < 10) month = '0' + month;
        work_days.push(`${day}-${month}`);
        count++;
      }
      today.setDate(today.getDate() + 1);
    }
    return work_days;
  }

  async retrieveGCPUserId() {
    const user = await this.usersService.findByUsername(
      this.configService.get('EMAIL_SENDER'),
    );
    return user.id;
  }

  async setContextGPT() {
    const spreadSheetContents: SpreadSheetContents[] = await this.getContent(
      await this.retrieveGCPUserId(),
      10,
      0,
    );
    let context_text =
      'Keep the answer very short. You are a helpful chatbot that can help people find reservation parking spots. ' +
      'A total of 10 parking slots are available each workday. No parking slots available on weekends. ' +
      'Following, you will find existing reservations done by people daily, separated by a new line. ' +
      `Formatted by 'day: names of people with reservation.' Be as concise as possible.` +
      `Only answer question from the context provided, for everything else just say: 'I am unable to help. Please Check with HR.' \n\n`;
    for (const spreadSheetContent of spreadSheetContents) {
      context_text =
        context_text +
        `${spreadSheetContent.day}: ${spreadSheetContent.emails.join(',')}\n`;
    }
    context_text = context_text + '\n\n ------------------\n';
    return context_text;
  }

  async getContent(
    id: number,
    numberofdays: number,
    start_day: number,
  ): Promise<SpreadSheetContents[]> {
    this.logger.log(`Geting user information for user id: ${id}`);
    const user = await this.usersService.findOne(id);

    this.oAuth2Client.setCredentials({
      access_token: user.google_token,
      refresh_token: user.refresh_token,
    });

    this.logger.log('Refreshing access token');
    // await this.oAuth2Client.refreshAccessToken();

    // Service Account Client
    await this.oauthSAClient.authorize();
    const sheets = google.sheets({ version: 'v4', auth: this.oauthSAClient });
    return this.getSpreadsheetContents(sheets, numberofdays, start_day);
  }

  async getSpreadsheetContents(
    sheets: sheets_v4.Sheets,
    numberofdays: number,
    start_day: number = 0,
  ) {
    this.logger.log('Retrieving google spreadsheets content');
    const days = this.getNextFewWorkDays(numberofdays, start_day);
    this.logger.log(days);
    // const parker_column_range = 'B3:F11';
    const parker_column_range = 'P:P';
    const contents: SpreadSheetContents[] = [];
    const dayPromise = [];
    for (const day of days) {
      const promise = sheets.spreadsheets.values.get({
        spreadsheetId: this.configService.get('SPREADSHEET_ID'),
        range: `${day}!${parker_column_range}`,
      });
      dayPromise.push({ day, promise });
    }

    const promiseResult = await Promise.allSettled(
      dayPromise.map((obj) => obj.promise),
    )
      .then((results) =>
        results.map((result, index) => ({
          day: dayPromise[index].day,
          status: result.status,
          value:
            result.status === 'fulfilled'
              ? (result as PromiseFulfilledResult<any>).value
              : null,
        })),
      )
      .catch((err) => {
        this.logger.error(err);
        return [];
      });

    const dayResponses = promiseResult.filter(
      (result) => result.status === 'fulfilled',
    );

    for (const dayResponse of dayResponses) {
      const day_content = <SpreadSheetContents>{};
      day_content.day = dayResponse.day;
      const rows = dayResponse.value.data.values;
      if (!rows || rows.length === 0) {
        continue;
      }
      const emails = [];
      for (const row of rows) {
        const email = row[0];
        if (email !== undefined) {
          emails.push(email);
        }
      }
      day_content.emails = emails;
      /*
      Following function should generate embedding for day_content using openAI api and save it to
      open source vector database
       */

      contents.push(day_content);
    }

    return contents;
  }
}

class SpreadSheetContents {
  day: string;
  emails: string[];
}
