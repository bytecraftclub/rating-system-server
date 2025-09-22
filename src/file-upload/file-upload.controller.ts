import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileUploadService } from './file-upload.service';
import { CreateFileUploadDto } from './dto/file-upload.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { GoogleDriveService } from '../google-drive/google-drive.service';

@Controller('files')
export class FileUploadController {
  constructor(
    private readonly fileUploadService: FileUploadService,
    private readonly driveService: GoogleDriveService,
  ) {}

  // ✅ Upload a file
  @Post('upload')
  //@UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 30 * 1024 * 1024 }), // 30MB limit
          new FileTypeValidator({
            fileType:
              /^(image\/(jpeg|png|gif)|application\/(pdf|msword|vnd\.openxmlformats-officedocument\.wordprocessingml\.document)|text\/plain)$/i,
          }),
        ],
      }),
    )
    file,
    @Body() dto: any,
  ) {
    const url = await this.driveService.uploadFile(file);
    // add file properties into DTO
    dto.originalName = file.originalname;
    dto.mimeType = file.mimetype;
    dto.fileSize = file.size;
    dto.fileUrl = url;
    console.log('Uploading file:', {
      ...dto,
      originalName: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size,
    });

    return await this.fileUploadService.uploadFile(dto);
  }

  // ✅ Get all files
  @Get('allFiles')
  // @UseGuards(JwtAuthGuard)
  async getAllFiles() {
    console.log('Fetching all files...');
    return await this.fileUploadService.getAllFiles();
  }

  @Delete(':fileId')
  async deleteFile(@Param('fileId') fileId: number) {
    return this.fileUploadService.deleteFileById(fileId);
  }
}
