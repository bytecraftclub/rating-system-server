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
  BadRequestException,
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
  // @UseGuards(JwtAuthGuard) // Uncomment when ready
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 50 * 1024 * 1024 }), // 50MB
          new FileTypeValidator({
            fileType: /^(image\/(jpeg|png|gif)|application\/pdf|text\/plain)$/i,
          }),
        ],
      }),
    )
    file,
    @Body() body: { userId?: string; taskTitle?: string },
  ) {
    // Validate required fields
    if (!body.userId || !body.taskTitle) {
      throw new BadRequestException('userId and taskTitle are required');
    }

    // Parse userId to number
    const userId = parseInt(body.userId, 10);
    if (isNaN(userId)) {
      throw new BadRequestException('userId must be a valid number');
    }

    try {
      // Upload to drive
      const url = await this.driveService.uploadFile(file);

      // Prepare DTO
      const dto: CreateFileUploadDto = {
        userId,
        taskTitle: body.taskTitle,
        originalName: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size,
        fileUrl: url,
      };

      return await this.fileUploadService.uploadFile(dto);
    } catch (error) {
      console.error('File upload error:', error);
      throw error;
    }
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
