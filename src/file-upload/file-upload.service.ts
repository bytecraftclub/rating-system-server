import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FileUpload } from './entities/file-upload.entity';
import { User } from 'src/user/entities/user.entity';
import { task } from './entities/task.entity';
import { CreateFileUploadDto } from './dto/file-upload.dto';
import { GoogleDriveService } from 'src/google-drive/google-drive.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class FileUploadService {
  constructor(
    @InjectRepository(FileUpload)
    private readonly fileRepository: Repository<FileUpload>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(task)
    private readonly taskRepository: Repository<task>,

    private readonly googleDriveService: GoogleDriveService,
    private readonly jwtService: JwtService,
  ) {}

  async uploadFile(dto: CreateFileUploadDto): Promise<string> {
    const user = await this.userRepository.findOne({
      where: { id: dto.userId },
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${dto.userId} not found`);
    }

    // ⏳ Check 24-hour rule
    if (user.lastfileupload) {
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

      if (user.lastfileupload > twentyFourHoursAgo) {
        throw new Error(
          `You can only upload one file every 24 hours. Last upload was at ${user.lastfileupload.toISOString()}`,
        );
      }
    }

    const task = await this.taskRepository.findOne({
      where: { title: dto.taskTitle },
    });
    if (!task) {
      throw new NotFoundException(
        `Task with title "${dto.taskTitle}" not found`,
      );
    }

    const file = this.fileRepository.create({
      originalName: dto.originalName,
      mimeType: dto.mimeType,
      fileSize: dto.fileSize,
      fileData: dto.fileUrl,
      user,
      task,
    });

    // ✅ Update user.lastfileupdate to now
    user.lastfileupload = new Date();
    await this.userRepository.save(user);
    await this.fileRepository.save(file);

    return 'file uploaded successfully';
  }

  // ✅ Get all files
  async getAllFiles(): Promise<FileUpload[]> {
    return this.fileRepository.find({
      relations: ['user', 'task'],
    });
  }

  // ✅ Get files by task title
  async getFilesByTaskTitle(taskTitle: string): Promise<FileUpload[]> {
    const task = await this.taskRepository.findOne({
      where: { title: taskTitle },
    });
    if (!task) {
      throw new NotFoundException(`Task with title "${taskTitle}" not found`);
    }

    return this.fileRepository.find({
      where: { task: { id: task.id } },
      relations: ['user', 'task'],
    });
  }

  // ✅ Delete all files of a task & add points to user’s score
  async deleteAllFilesByTaskTitleAndAddScore(taskTitle: string): Promise<void> {
    const task = await this.taskRepository.findOne({
      where: { title: taskTitle },
    });
    if (!task) {
      throw new NotFoundException(`Task with title "${taskTitle}" not found`);
    }

    const files = await this.fileRepository.find({
      where: { task: { id: task.id } },
      relations: ['user'],
    });

    if (files.length === 0) {
      throw new NotFoundException(`No files found for task "${taskTitle}"`);
    }

    for (const file of files) {
      if (file.user) {
        file.user.score += task.points; // ✅ add task points to user
        await this.userRepository.save(file.user);
      }
    }

    await this.fileRepository.remove(files);
  }

  async deleteFileById(fileid: number): Promise<{ message: string }> {
    // Load file with relations
    const file = await this.fileRepository.findOne({
      where: { id: fileid },
      relations: ['task', 'user'],
    });

    if (!file) {
      throw new NotFoundException(`File with name "${fileid}" not found`);
    }

    // Add task points to user score
    file.user.score += file.task.points;
    await this.userRepository.save(file.user);

    // Delete file
    await this.fileRepository.remove(file);

    return {
      message: `File "${fileid}" deleted and ${file.task.points} points added to user.`,
    };
  }

  async acceptFile(fileId: number): Promise<string> {
    const file = await this.fileRepository.findOne({
      where: { id: fileId },
      relations: ['user', 'task'],
    });

    if (!file) throw new NotFoundException(`File with ID ${fileId} not found`);

    if (file.task) {
      file.user.score += file.task.points;
      await this.userRepository.save(file.user);
    }

    // Delete from Google Drive (use driveFileId instead of name ideally)
    try {
      await this.googleDriveService.deleteFile(file.fileData);
    } catch (err) {
      console.error('Failed to delete from Google Drive:', err.message);
    }

    await this.fileRepository.remove(file);
    return `File  accepted, points added, and deleted successfully`;
  }

  // ❌ Refuse file: only delete without adding points
  async refuseFile(fileId: number): Promise<string> {
    const file = await this.fileRepository.findOne({
      where: { id: fileId },
    });

    if (!file) throw new NotFoundException(`File with ID ${fileId} not found`);

    try {
      await this.googleDriveService.deleteFile(file.fileData);
    } catch (err) {
      console.error('Failed to delete from Google Drive:', err.message);
    }

    await this.fileRepository.remove(file);
    return `File refused and deleted successfully`;
  }
}
