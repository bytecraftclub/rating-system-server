import { Injectable } from '@nestjs/common';
import { google } from 'googleapis';
import { Readable } from 'stream';
import * as dotenv from 'dotenv';
dotenv.config();

@Injectable()
export class GoogleDriveService {
  private drive;

  constructor() {
    const credentials = process.env.GOOGLE_DRIVE_KEY
      ? JSON.parse(process.env.GOOGLE_DRIVE_KEY)
      : null;

    if (!credentials) {
      throw new Error(
        'Google Drive credentials not found in environment variables',
      );
    }

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive'],
    });

    this.drive = google.drive({ version: 'v3', auth });
  }

  async uploadFile(file): Promise<string> {
    const res = await this.drive.files.create({
      requestBody: {
        name: file.originalname,
        mimeType: file.mimetype,
        parents: ['0AObSY20y_EdAUk9PVA'], // Shared folder ID
      },
      media: {
        mimeType: file.mimetype,
        body: Readable.from(file.buffer),
      },
      fields: 'id',
      supportsAllDrives: true,
    });

    const fileId = res.data.id;
    console.log(`Uploaded file: ${res.data.name} (${fileId})`);

    // Return direct download link
    return `https://drive.google.com/uc?id=${fileId}`;
  }

  async deleteFile(fileIdOrUrl: string): Promise<void> {
    try {
      // Extract file ID if input is a URL
      const fileIdMatch = fileIdOrUrl.match(/[-\w]{25,}/);
      const fileId = fileIdMatch ? fileIdMatch[0] : fileIdOrUrl;

      await this.drive.files.delete({
        fileId,
        supportsAllDrives: true,
      });

      console.log(`Deleted file ${fileId} from Google Drive`);
    } catch (error) {
      console.error(`Failed to delete file ${fileIdOrUrl}:`, error.message);
      throw new Error('Google Drive file deletion failed');
    }
  }
}
