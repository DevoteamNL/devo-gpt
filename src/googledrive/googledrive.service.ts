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
import { AzureOpenAIClientService } from '../openai/azure-openai-client.service';
import { Completions } from '@azure/openai';
import { ChatMessage } from 'langchain/schema';
import fuzzball from 'fuzzball';

interface File {
  id: string;
  name: string;
  mimeType: string;
  createdTime: string;
  modifiedTime: string;
}

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
    private readonly azureOpenAIClient: AzureOpenAIClientService,
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
    this.logger.log(`Search query: ${query}`);

    // Use the Google Drive API to list files matching the query
    const results = await this.driveClient.files.list({
      q: query,
      fields:
        'nextPageToken, files(id, name, mimeType,createdTime,modifiedTime)',
      pageSize: 1000, // Adjust this based on your needs
      corpora: 'allDrives',
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
    });

    this.logger.log(`Found ${results.data.files.length} files`);
    // If no files are found, return an empty result
    if (!results.data.files || results.data.files.length === 0) {
      this.logger.log('No files found');
      return {};
    }
    const files = results.data.files;

    const skipFiles = [
      '1wy4Z4QclqXYwH9iwVmMNlwcy2g63cBOq',
      '11HLMVwXlFQ6gqKPyt0x0F1KyPBkzbg3I',
      '1hdQ0d8nM_g7aUwhU92eZ0d6lMcrSYsE-',
      '1LG-5_ldFX7LPQPnPmMD91_noOANaalIJ',
      '1xlfxWzoOMyY6TQsqu_T1SQsxIdLH6yfK',
      '1Nf-T5-8WZitRYZ4fC0NUon27Nto7uNGi',
    ];

    const fileIds = files.map((file) => file.id);
    // await this.cognitiveSearchService.deleteAllDocuments();
    // skipFiles.push(
    //   ...(await this.cognitiveSearchService.getDocumentsByFileIds(fileIds)),
    // );

    const uniqueLatestFiles = this.remove_duplicate_files(files);

    // Fetch content for each file
    const fileContents = [];
    // initialize count varible to stop for loop after 10 iterations

    const chunks = [];
    for (let i = 0; i < uniqueLatestFiles.length; i += 10) {
      chunks.push(uniqueLatestFiles.slice(i, i + 10));
    }

    for (const chunk of chunks) {
      const promises = chunk
        .filter((file) => !skipFiles.includes(file.id))
        .map(async (file, index) => {
          const count = index + 1;
          this.logger.log(
            `Fetching content for id:"${file.id}" Name: "${file.name}" count: ${count}`,
          );
          await this.process_file(file, mimeTypeMap);
        });

      await Promise.all(promises);
      await new Promise((resolve) => setTimeout(resolve, 90000)); // Wait for 90 seconds
    }

    return fileContents;
  }

  private remove_duplicate_files(files) {
    function findBestMatchGroup(file: File, groups: File[][]): number {
      let bestMatchIndex = -1;
      let highestScore = 0;

      groups.forEach((group: any[], index) => {
        // We'll just compare with the first item of each group as a representative
        const score = fuzzball.ratio(file.name, group[0].name);

        if (score > 83 && score > highestScore) {
          highestScore = score;
          bestMatchIndex = index;
        }
      });

      return bestMatchIndex;
    }

    // Group files by fuzzy name matching
    const groupedFiles: File[][] = [];
    files.forEach((file) => {
      const matchIndex = findBestMatchGroup(file, groupedFiles);

      if (matchIndex > -1) {
        // If a similar group is found, add to that group
        groupedFiles[matchIndex].push(file);
      } else {
        // Otherwise, start a new group
        groupedFiles.push([file]);
      }
    });

    // Sort and filter as before
    const uniqueLatestFiles: File[] = groupedFiles.map((group) => {
      return group.sort((a, b) =>
        b.modifiedTime.localeCompare(a.modifiedTime),
      )[0];
    });

    // 'uniqueLatestFiles' now contains only the latest version of each CV
    console.log(`Filtered ${uniqueLatestFiles.length} unique/latest files`);
    return uniqueLatestFiles;
  }

  private async process_file(
    file,
    mimeTypeMap: { pptx: string; googleslides: string; docx: string },
  ) {
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

      const detailedPrompt = `Please organize the following CV content into distinct,clearly defined sections, separated by "####CHUNK####". 
Sections: "Personal Contact Details and Summary", "Professional Experience with Skills", "Education ands Certifications", and any other relevant sections.
Ensure each section is comprehensive and self-contained, providing all necessary information within the chunk.
Do not modify the content of the CV. Professional experience should be as detailed as it is in CV.
Keep details of each project experience, do not summarize it.



##### CV Content STARTs #####
=========================================================================


${content}


=========================================================================
##### CV Content ENDs #####

`;

      const chunkedResponse = await this.openaiService.getChatCompletions(
        [
          {
            role: 'system',
            content: `Please organize the following CV content into distinct,clearly defined sections, separated by "####CHUNK####". 
Sections: "Personal Contact Details and Summary", "Professional Experience with Skills", "Education ands Certifications", and any other relevant sections.
Ensure each section is comprehensive and self-contained, providing all necessary information within the chunk.
Do not modify the content of the CV. Professional experience should be as detailed as it is in CV.
Keep details of each project experience, do not summarize it.
If abbreviations are used, please also expand them for clarity.
Each chunk should have user's name in it, so we know each chunk belongs to which user.

Remember Each segment should be seperated by "####CHUNK####" 
Remember, the goal is to make each section of the CV as informative as possible`,
          },
          {
            role: 'user',
            content: detailedPrompt,
          },
        ],
        { temperature: 0.7 },
      );
      this.logger.log(`Chunked response: ${JSON.stringify(chunkedResponse)}`);
      const chunksText = chunkedResponse.choices[0].message.content;

      // Step 2: Split the chunks by the delimiter
      const chunks = chunksText
        .split('####CHUNK####')
        .filter((chunk) => chunk.trim() !== '');

      this.logger.log(`Chunks received for ${file.name}`);
      this.logger.log(`Chunks: ${chunks}`);

      // Step 3: Create an array of objects for each chunk and upload
      const chunkedDocumentsPromise = chunks.map(async (chunk, index) => ({
        fileId: `${file.id}_chunk_${index}`, // Unique ID for each chunk
        title: `${file.name} (Chunk ${index + 1})`,
        content: chunk,
        // You might need to generate a content vector for each chunk if required by your cognitive search service
        contentVector: await this.openaiService.generateEmbedding(chunk),
      }));
      const chunkedDocuments = await Promise.all(chunkedDocumentsPromise);
      this.logger.log(`Chunked documents: ${chunkedDocuments}`);
      await this.cognitiveSearchService.uploadDocuments(chunkedDocuments);
    } catch (error) {
      // Log the error for that specific file and continue with the next file
      this.logger.error(
        `Error processing file "${file.name}": ${error.message}`,
      );
    }
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

    const pptx = new PPTX.Composer();
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
