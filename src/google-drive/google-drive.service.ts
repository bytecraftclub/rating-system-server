import { Injectable } from '@nestjs/common';
import { google } from 'googleapis';
import { Readable } from 'stream';
import * as path from 'path';

@Injectable()
export class GoogleDriveService {
  private drive;

  constructor() {
    const auth = new google.auth.GoogleAuth({
      keyFile: path.join(
        __dirname,
        '../../src/config/neat-airport-469410-k0-c08723aacab2.json',
      ),
      scopes: ['https://www.googleapis.com/auth/drive'],
    });

    this.drive = google.drive({ version: 'v3', auth });
  }

  async uploadFile(file): Promise<string> {
    // ✅ Upload to the shared folder
    const res = await this.drive.files.create({
      requestBody: {
        name: file.originalname,
        mimeType: file.mimetype,
        parents: ['0AObSY20y_EdAUk9PVA'],
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

    // ✅ Make file public
    // await this.drive.permissions.create({
    //   fileId,
    //   requestBody: { role: 'reader', type: 'anyone' },
    // });

    // ✅ Return public URL
    return `https://drive.google.com/uc?id=${fileId}`;
  }
}
