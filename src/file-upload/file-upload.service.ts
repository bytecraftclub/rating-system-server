import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FileUpload } from './entities/file-upload.entity';
import { User } from 'src/user/entities/user.entity';
import { task } from './entities/task.entity';
import { CreateFileUploadDto } from './dto/file-upload.dto';
import { GoogleDriveService } from 'src/google-drive/google-drive.service';
import { JwtService } from '@nestjs/jwt';
import { NotificationsService } from 'src/notifications/notifications.service';

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
    private readonly notificationService: NotificationsService,
  ) {}

  async uploadFile(dto: CreateFileUploadDto): Promise<{ message: string }> {
    // Find user with tasks relation
    const user = await this.userRepository.findOne({
      where: { id: dto.userId },
      relations: ['tasks'], // Load user's completed tasks
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${dto.userId} not found`);
    }

    // Find task
    const task = await this.taskRepository.findOne({
      where: { title: dto.taskTitle },
    });
    if (!task) {
      throw new NotFoundException(
        `Task with title "${dto.taskTitle}" not found`,
      );
    }

    // Check if user has already completed this task
    const hasCompletedTask = user.tasks.some(
      (completedTask) => completedTask.id === task.id,
    );
    if (hasCompletedTask) {
      throw new BadRequestException(
        `You have already completed the task "${dto.taskTitle}". Each task can only be submitted once.`,
      );
    }

    // Check daily upload limit (3 uploads per 24 hours)
    if (user.lastfileupload) {
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

      // If last upload was within 24 hours, check the upload count
      if (user.lastfileupload > twentyFourHoursAgo) {
        // User is within the 24-hour window
        if (user.uploads >= 3) {
          const timeRemaining = this.getTimeRemaining(user.lastfileupload);
          throw new BadRequestException(
            `You have reached your daily upload limit (3 files per day). Please wait ${timeRemaining} before uploading again.`,
          );
        }
        // Still within 24 hours and under limit - increment the counter
        user.uploads += 1;
      } else {
        // More than 24 hours have passed - reset the counter
        user.uploads = 1;
      }
    } else {
      // First upload ever
      user.uploads = 1;
    }

    // Create file record
    const file = this.fileRepository.create({
      originalName: dto.originalName,
      mimeType: dto.mimeType,
      fileSize: dto.fileSize,
      fileData: dto.fileUrl,
      user,
      task,
    });

    // Update user's last upload timestamp
    user.lastfileupload = new Date();

    // Save both entities
    await this.userRepository.save(user);
    await this.fileRepository.save(file);

    return { message: 'File uploaded successfully' };
  }

  private getTimeRemaining(lastUpload: Date): string {
    const now = new Date();
    const nextAllowedUpload = new Date(lastUpload);
    nextAllowedUpload.setHours(nextAllowedUpload.getHours() + 24);

    const diff = nextAllowedUpload.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return `${hours}h ${minutes}m`;
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
    this.notificationService.createNotification(
      file.task.title,
      true,
      file.user.id,
    );
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
    await this.notificationService.createNotification(
      file.task.title,
      false,
      file.user.id,
    );
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
