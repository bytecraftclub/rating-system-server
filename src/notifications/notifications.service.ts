// notification.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { User } from 'src/user/entities/user.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  // 1. Create a notification
  async createNotification(
    taskName: string,
    approved: boolean,
    userId: number,
  ): Promise<Notification> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const message = approved
      ? `🎉 Congratulations! Your task "${taskName}" has been approved and completed successfully!`
      : `📨 ByteCraft has viewed your request.`;

    const notification = this.notificationRepo.create({
      message,
      user,
      read: false,
    });

    return await this.notificationRepo.save(notification);
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
