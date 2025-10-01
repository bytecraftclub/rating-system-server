import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileUploadController } from './file-upload.controller';
import { FileUploadService } from './file-upload.service';
import { FileUpload } from './entities/file-upload.entity';
import { UserModule } from 'src/user/user.module';
import { User } from 'src/user/entities/user.entity';
import { task } from './entities/task.entity';
import { GoogleDriveService } from '../google-drive/google-drive.service';
import { google } from 'googleapis';
import { GoogleDriveModule } from 'src/google-drive/google-drive.module';
import { JwtModule } from '@nestjs/jwt';
import { NotificationsModule } from 'src/notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([FileUpload]),
    TypeOrmModule.forFeature([User]),
    TypeOrmModule.forFeature([task]),
    UserModule,
    GoogleDriveModule,
    JwtModule,
    NotificationsModule,
  ],
  controllers: [FileUploadController],
  providers: [FileUploadService],
  exports: [FileUploadService],
})
export class FileUploadModule {}
