// notification.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { User } from 'src/user/entities/user.entity';
import { task } from 'src/file-upload/entities/task.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(task)
    private readonly taskRepository: Repository<task>,
  ) {}

  // 1. Create a notification

  async createNotification(
    taskName: string,
    approved: boolean,
    userId: number,
  ): Promise<Notification> {
    console.log(approved);
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['tasks'], // Load user's current completed tasks
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    let message: string;

    if (approved) {
      message = `🎉 Congratulations! Your task "${taskName}" has been approved and completed successfully!`;

      // Find the corresponding task
      const task = await this.taskRepository.findOne({
        where: { title: taskName },
      });

      if (task) {
        // Ensure user.tasks is initialized
        user.tasks = user.tasks ?? [];

        const alreadyHasTask = user.tasks.some(
          (completedTask) => completedTask.id === task.id,
        );

        if (!alreadyHasTask) {
          user.tasks.push(task);
          await this.userRepo.save(user);
        }
      } else {
        console.warn(`Task "${taskName}" not found in the database.`);
      }
    } else {
      message = `⚠️ Update: Your task "${taskName}" was not accepted. Please try again.`;
    }

    // Create a notification linked to the user
    const notification = this.notificationRepo.create({
      message,
      user,
      read: false,
    });

    return this.notificationRepo.save(notification);
  }

  async markMultipleAsRead(ids: string[]) {
    // Example with TypeORM
    await this.notificationRepo.update({ id: In(ids) }, { read: true });

    return {
      success: true,
      message: `${ids.length} notifications marked as read`,
      ids,
    };
  }

  // 3. Delete all notifications for a user
  async deleteAll(userId: number): Promise<void> {
    await this.notificationRepo.delete({ user: { id: userId } });
  }
  async findUserNotif(userId: number): Promise<Notification[]> {
    return this.notificationRepo.find({
      where: { user: { id: userId } },
      relations: ['user'], // ✅ load user relation if needed
      order: { createdAt: 'DESC' }, // optional: latest first
    });
  }
}
