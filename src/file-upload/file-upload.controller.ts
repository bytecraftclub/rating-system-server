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
  Patch,
  ParseIntPipe,
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
          new MaxFileSizeValidator({ maxSize: 50 * 1024 * 1024 }),
          new FileTypeValidator({
            fileType: /^(image\/(jpeg|png|gif)|application\/pdf|text\/plain)$/i,
          }),
        ],
      }),
    )
    file,
    @Body() dto: any,
  ) {
    const url = await this.driveService.uploadFile(file);
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

  @Patch(':id/accept')
  async acceptFile(@Param('id', ParseIntPipe) id: number) {
    return await this.fileUploadService.acceptFile(id);
  }

  // ❌ Refuse file: only delete file without adding points
  @Delete(':id/refuse')
  async refuseFile(@Param('id', ParseIntPipe) id: number) {
    return await this.fileUploadService.refuseFile(id);
  }

  @Delete(':fileId')
  async deleteFile(@Param('fileId') fileId: number) {
    return this.fileUploadService.deleteFileById(fileId);
  }
}
