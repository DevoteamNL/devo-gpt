import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { GoogleOauth2ClientService } from '../auth/GoogleOauth2Client.service';
import { OpenaiService } from '../openai/openai.service';
import { UsersService } from '../users/users.service';
import { google } from 'googleapis';
import mammoth from 'mammoth';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

import PPTX from 'nodejs-pptx';
import pdf from 'pdf-parse';
import { CognitiveSearchService } from '../cognitive-search/cognitive-search.service';

@Injectable()
export class GoogledriveService {
  private readonly logger = new Logger(GoogledriveService.name);
  private readonly oAuth2Client;
  private readonly driveClient;

  constructor(
    private readonly usersService: UsersService,
    private readonly googleOauth2ClientService: GoogleOauth2ClientService,
    private readonly openaiService: OpenaiService,
    private readonly cognitiveSearchService: CognitiveSearchService,
  ) {
    this.oAuth2Client = this.googleOauth2ClientService.getOauth2Client();
    this.driveClient = google.drive({
      version: 'v3',
      auth: this.oAuth2Client,
    });
  }

  async searchresponse(message) {
    return this.cognitiveSearchService.doSemanticHybridSearch(message);
  }

  async uploadURL(
    google_drive_url: string,
    userEmail: string,
  ): Promise<string> {
    const user = await this.usersService.findByUsername(userEmail);
    if (!user)
      throw new NotFoundException(`User with email ${userEmail} not found`);

    this.setOAuthCredentials(user.google_token, user.refresh_token);
    //await this.getContent(google_drive_url, userEmail);
    const results = await this.searchFiles(['cv'], ['docx']);
    return results.toString();
  }

  /**
   * Search for files on Google Drive with specific keywords in their name and of specific mime types.
   * @param keywords - Array of keywords to search in the file name.
   * @param types - Array of mime types to filter the files.
   * @returns - List of file names and their respective content.
   */
  async searchFiles(keywords: string[], types: string[]) {
    // Map the types to their corresponding mime types
    const mimeTypeMap = {
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      googleslides: 'application/vnd.google-apps.presentation',
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      // Add other types to mimeType mapping as needed
    };

    // Create a search query
    const nameQueries = keywords.map((keyword) => `name contains '${keyword}'`);
    const typeQueries = types.map(
      (type) => `mimeType = '${mimeTypeMap[type]}'`,
    );
    const query = `(${nameQueries.join(' or ')}) and (${typeQueries.join(
      ' or ',
    )})`;

    // Use the Google Drive API to list files matching the query
    const results = await this.driveClient.files.list({
      q: query,
      fields: 'files(id, name, mimeType)',
      pageSize: 1000, // Adjust this based on your needs
    });

    // If no files are found, return an empty result
    if (!results.data.files || results.data.files.length === 0) {
      return {};
    }

    const skipFiles = [
      '1wy4Z4QclqXYwH9iwVmMNlwcy2g63cBOq',
      '11HLMVwXlFQ6gqKPyt0x0F1KyPBkzbg3I',
      '1hdQ0d8nM_g7aUwhU92eZ0d6lMcrSYsE-',
      '1LG-5_ldFX7LPQPnPmMD91_noOANaalIJ',
      '1xlfxWzoOMyY6TQsqu_T1SQsxIdLH6yfK',
      '1Nf-T5-8WZitRYZ4fC0NUon27Nto7uNGi',
    ];

    const fileIds = results.data.files.map((file) => file.id);
    skipFiles.push(
      ...(await this.cognitiveSearchService.getDocumentsByFileIds(fileIds)),
    );

    // Fetch content for each file
    const fileContents = [];
    // initialize count varible to stop for loop after 10 iterations
    let count = 0;
    for (const file of results.data.files) {
      if (skipFiles.includes(file.id)) continue;

      count++;
      this.logger.log(
        `Fetching content for id:"${file.id}" Name: "${file.name}" count: ${count}`,
      );

      try {
        // New try-catch block to handle individual file errors
        let content = '';
        switch (file.mimeType) {
          case mimeTypeMap['docx']:
            content = await this.handleDocx(file.id);
            break;
          case mimeTypeMap['googleslides']:
            content = await this.handleGoogleWorkspaceFiles(file.id);
            break;
          case mimeTypeMap['pptx']:
            content = await this.handlePPTX(file.id);
            break;
        }

        this.logger.log(`Content received for ${file.name}`);
        const contentVector = await this.openaiService.generateEmbedding(
          content,
        );
        fileContents.push({
          fileId: file.id,
          title: file.name,
          content,
          contentVector,
        });
        await this.cognitiveSearchService.uploadDocuments([
          {
            fileId: file.id,
            title: file.name,
            content,
            contentVector,
          },
        ]);
      } catch (error) {
        // Log the error for that specific file and continue with the next file
        this.logger.error(
          `Error processing file "${file.name}": ${error.message}`,
        );
      }
    }

    return fileContents;
  }

  private async handleDocx(google_drive_url: string): Promise<string> {
    const docxBuffer = await this.downloadBlobFile(google_drive_url);
    return this.extractTextFromDocx(docxBuffer);
  }

  private async handleGoogleWorkspaceFiles(
    google_drive_url: string,
  ): Promise<string> {
    const fileContentBuffer = await this.downloadGoogleWorkspaceFile(
      google_drive_url,
    );
    return fileContentBuffer.toString();
  }

  // private async handlePDF(google_drive_url: string): Promise<string> {
  //   // Download the PDF file as a buffer
  //   const pdfBuffer = await this.downloadBlobFile(google_drive_url);
  //
  //   // Extract text from the PDF buffer
  //   const data = await pdf(pdfBuffer);
  //
  //   return data.text;
  // }

  private async handlePPTX(google_drive_url: string): Promise<string> {
    // Download the PPTX file as a buffer
    const pptxBuffer = await this.downloadBlobFile(google_drive_url);

    // Convert the buffer to a temporary file because node-pptx might need a file path
    const tmpFilePath = await this.bufferToTempFile(pptxBuffer, '.pptx');

    let pptx = new PPTX.Composer();
    await pptx.load(tmpFilePath);

    let extractedText = '';

    // Iterate through the slides and extract text
    for (const slide of pptx.slides) {
      for (const shape of slide.shapes) {
        if (shape.text) {
          extractedText += shape.text + '\n';
        }
      }
    }

    // Clean up the temporary file
    fs.unlinkSync(tmpFilePath);

    return extractedText;
  }

  private bufferToTempFile(buffer: Buffer, extension: string): Promise<string> {
    const tmpFilePath = path.join(
      os.tmpdir(),
      `tempfile_${Date.now()}${extension}`,
    );
    return new Promise((resolve, reject) => {
      fs.writeFile(tmpFilePath, buffer, (err) => {
        if (err) reject(err);
        else resolve(tmpFilePath);
      });
    });
  }

  private setOAuthCredentials(accessToken: string, refreshToken: string): void {
    this.oAuth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
  }

  // private async getFileMetadata(fileId: string) {
  //   const metadata = await this.driveClient.files.get({
  //     fileId,
  //     fields: 'id, name, mimeType',
  //   });
  //   return metadata.data;
  // }

  private async downloadGoogleWorkspaceFile(fileId: string): Promise<Buffer> {
    const res = await this.driveClient.files.export(
      { fileId, mimeType: 'text/plain' },
      { responseType: 'stream' },
    );
    return this.streamToBuffer(res.data);
  }

  private async downloadBlobFile(fileId: string): Promise<Buffer> {
    const res = await this.driveClient.files.get(
      { fileId, alt: 'media' },
      { responseType: 'stream' },
    );
    return this.streamToBuffer(res.data);
  }

  private streamToBuffer(stream): Promise<Buffer> {
    const fileContentBuffer = [];
    return new Promise((resolve, reject) => {
      stream
        .on('data', (chunk) => fileContentBuffer.push(chunk))
        .on('end', () => resolve(Buffer.concat(fileContentBuffer)))
        .on('error', reject);
    });
  }

  private async extractTextFromDocx(docxBuffer: Buffer): Promise<string> {
    const result = await mammoth.extractRawText({ buffer: docxBuffer });
    return result.value;
  }
}

//
//
// private async getContent(
//   google_drive_url: string,
//   userEmail: string,
// ): Promise<void> {
//   this.logger.log(`Getting content from ${google_drive_url}`);
//
//   const user = await this.usersService.findByUsername(userEmail);
//   if (!user)
// throw new NotFoundException(`User with email ${userEmail} not found`);
//
// this.setOAuthCredentials(user.google_token, user.refresh_token);
//
// let extractedText: string;
// try {
//   const { name, mimeType } = await this.getFileMetadata(google_drive_url);
//   console.log({ name, mimeType });
//
//   // Google Docs: "application/vnd.google-apps.document"
//   // Call this.handleGoogleWorkspaceFiles(google_drive_url);
//   // Microsoft Docs: "application/vnd.openxmlformats-officedocument.wordprocessingml.document
//   // Call this.handleDocx(google_drive_url);
//   // Google Slids: "application/vnd.google-apps.presentation"
//   // Call this.handleGoogleWorkspaceFiles(google_drive_url);
//   // Microsoft PPT: "application/vnd.openxmlformats-officedocument.presentationml.presentation"
//   // Call this.handlePPTX(google_drive_url);
//   // PDF: "application/pdf"
//   // Call this.handlePDF(google_drive_url);
//
//   let extractedText: string;
//
//   switch (mimeType) {
//     case 'application/vnd.google-apps.document':
//     case 'application/vnd.google-apps.presentation':
//       extractedText = await this.handleGoogleWorkspaceFiles(
//         google_drive_url,
//       );
//       break;
//
//     case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
//       extractedText = await this.handleDocx(google_drive_url);
//       break;
//
//     // TODO: Fix me
//     // case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
//     //   extractedText = await this.handlePPTX(google_drive_url);
//     //   break;
//
//     case 'application/pdf':
//       extractedText = await this.handlePDF(google_drive_url);
//       break;
//
//     default:
//       this.logger.error(`Unsupported mimeType: ${mimeType}`);
//       break;
//   }
//
//   this.logger.log(`Extracted text from ${name}`);
// } catch (err) {
//   this.logger.error(
//     `Error downloading file from ${google_drive_url}`,
//     err.stack,
//   );
//   throw err;
// }
// }
