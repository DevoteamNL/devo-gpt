import { Injectable, Logger } from '@nestjs/common';
import { google } from 'googleapis';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CommunicationsService {
  constructor(private readonly configService: ConfigService) {}

  private readonly logger = new Logger(CommunicationsService.name);

  makeBody(to, from, subject, message) {
    const str = [
      'Content-Type: text/plain; charset="UTF-8"\n',
      'MIME-Version: 1.0\n',
      'Content-Transfer-Encoding: 7bit\n',
      `to: ${to}\n`,
      `from: ${from}\n`,
      `subject: ${subject}\n\n`,
      message,
    ].join('');

    return new Buffer(str)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  }

  async sendEmail(auth, to) {
    const gmail = google.gmail({ version: 'v1', auth });
    const date = new Date();
    //const formattedDate = date.toDateString() + ' ' + date.toTimeString();
    const parkingViewLink =
      'https://docs.google.com/spreadsheets/d/' +
      this.configService.get('SPREADSHEET_ID');

    const raw = this.makeBody(
      to,
      this.configService.get('EMAIL_SENDER'),
      'Reserved Parking Spot Notification',
      `Dear ${to.split('.')[0]},\n\n` +
        `We would like to inform you that you have reserved parking spot for tomorrow.\n\n` +
        `You can view your reserved parking spot by following this link: ${parkingViewLink}\n\n` +
        'If you are not going to use your reserved parking spot, ' +
        'we kindly request that you free it up for others to utilize.\n\n' +
        'Thank you for your co-operation.\n\n' +
        `This is Auto-Generated email. Don't reply to this email. reach out to HR\n` +
        'Best regards,\n' +
        'HR Team',
    );

    this.logger.log(`Sending... ${to}`);

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const res = await gmail.users.messages.send({
      auth: auth,
      userId: this.configService.get('SA_EMAIL_ID'),
      resource: {
        raw: raw,
      },
    });
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const labels = res.data.labels;
    if (!labels || labels.length === 0) {
      console.log('No labels found.');
      return;
    }
    console.log('Labels:');
    labels.forEach((label) => {
      console.log(`- ${label.name}`);
    });
  }
}
