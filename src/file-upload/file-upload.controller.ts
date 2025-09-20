import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  UseInterceptors,
  UploadedFile,
  Body,
  Req,
  Res,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileUploadService } from './file-upload.service';
import { Request, Response } from 'express';

@Controller('files')
export class FileUploadController {
  constructor(private readonly fileUploadService: FileUploadService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 30 * 1024 * 1024 }), // 10MB limit
          new FileTypeValidator({
            fileType:
              /^(image\/(jpeg|png|gif)|application\/(pdf|msword|vnd\.openxmlformats-officedocument\.wordprocessingml\.document)|text\/plain)$/i,
          }),
        ],
      }),
    )
    file,
    @Req() req,
  ) {
    // In a real app, you'd extract userId from JWT token or session
    const userId = parseInt(req.headers['user-id'] as string) || 1;

    return await this.fileUploadService.uploadFile(userId, file);
  }

  @Get('my-file')
  async getMyFile(@Req() req) {
    const userId = parseInt(req.headers['user-id'] as string) || 1;
    const file = await this.fileUploadService.getUserFile(userId);

    if (!file) {
      throw new NotFoundException('No file found');
    }

    // Return file info without the binary data
    return {
      id: file.id,
      originalName: file.originalName,
      mimeType: file.mimeType,
      fileSize: file.fileSize,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
    };
  }

  @Get('download')
  async downloadFile(@Req() req, @Res() res) {
    const userId = parseInt(req.headers['user-id'] as string) || 1;
    const { data, file } = await this.fileUploadService.getFileData(userId);

    res.set({
      'Content-Type': file.mimeType,
      'Content-Disposition': `attachment; filename="${file.originalName}"`,
      'Content-Length': file.fileSize.toString(),
    });

    res.send(data);
  }

  @Delete('delete')
  async deleteFile(@Req() req) {
    const userId = parseInt(req.headers['user-id'] as string) || 1;
    await this.fileUploadService.deleteFile(userId);
    return { message: 'File deleted successfully' };
  }
}
