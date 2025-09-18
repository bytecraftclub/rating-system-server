import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { FileUpload } from './entities/file-upload.entity';
import { Multer } from 'multer';
import { UpdateFileDto } from './dto/file-upload.dto';

@Injectable()
export class FileUploadService {
  constructor(
    @InjectRepository(FileUpload)
    private readonly fileUploadRepository: Repository<FileUpload>,
  ) {}

  async canUserUpload(userId: number): Promise<boolean> {
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const recentUpload = await this.fileUploadRepository.findOne({
      where: {
        userId,
        createdAt: MoreThanOrEqual(twentyFourHoursAgo),
      },
    });

    return !recentUpload;
  }

  async uploadFile(userId: number, file: Multer.File): Promise<FileUpload> {
    // Check if user can upload (24-hour limit)
    const canUpload = await this.canUserUpload(userId);
    if (!canUpload) {
      throw new ForbiddenException('You can only upload one file per 24 hours');
    }

    // Delete existing file if user has one
    await this.deleteUserExistingFiles(userId);

    const fileUpload = this.fileUploadRepository.create({
      userId,
      originalName: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size,
      fileData: file.buffer,
    });

    return await this.fileUploadRepository.save(fileUpload);
  }

  async getUserFile(userId: number): Promise<FileUpload | null> {
    return await this.fileUploadRepository.findOne({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async getUserFileWithData(userId: number): Promise<FileUpload | null> {
    return await this.fileUploadRepository.findOne({
      where: { userId },
      order: { createdAt: 'DESC' },
      select: [
        'id',
        'userId',
        'originalName',
        'mimeType',
        'fileSize',
        'fileData',
        'createdAt',
        'updatedAt',
      ],
    });
  }

  async updateFile(
    userId: number,
    updateData: UpdateFileDto,
  ): Promise<FileUpload> {
    const fileUpload = await this.getUserFile(userId);

    if (!fileUpload) {
      throw new NotFoundException('No file found for this user');
    }

    // Check if file is within 24 hours
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    if (fileUpload.createdAt < twentyFourHoursAgo) {
      throw new ForbiddenException(
        'File can only be edited within 24 hours of upload',
      );
    }

    Object.assign(fileUpload, updateData);
    return await this.fileUploadRepository.save(fileUpload);
  }

  async deleteFile(userId: number): Promise<void> {
    const fileUpload = await this.getUserFile(userId);

    if (!fileUpload) {
      throw new NotFoundException('No file found for this user');
    }

    // Check if file is within 24 hours
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    if (fileUpload.createdAt < twentyFourHoursAgo) {
      throw new ForbiddenException(
        'File can only be deleted within 24 hours of upload',
      );
    }

    await this.fileUploadRepository.remove(fileUpload);
  }

  private async deleteUserExistingFiles(userId: number): Promise<void> {
    const existingFiles = await this.fileUploadRepository.find({
      where: { userId },
    });

    if (existingFiles.length > 0) {
      await this.fileUploadRepository.remove(existingFiles);
    }
  }

  async getFileData(
    userId: number,
  ): Promise<{ data: Buffer; file: FileUpload }> {
    const fileUpload = await this.getUserFileWithData(userId);

    if (!fileUpload) {
      throw new NotFoundException('No file found for this user');
    }

    return { data: fileUpload.fileData, file: fileUpload };
  }
}
