import { Module } from '@nestjs/common';
import { GoogleDriveService } from './google-drive.service';

@Module({
  controllers: [],
  providers: [GoogleDriveService],
  exports: [GoogleDriveService],
})
export class GoogleDriveModule {}
