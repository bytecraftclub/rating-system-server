import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('notification')
  create(@Body() body: any) {
    const { taskName, approved, userId } = body;

    const isApproved = approved === true || approved === 'true';

    return this.notificationsService.createNotification(
      taskName,
      isApproved,
      Number(userId),
    );
  }

  @Get()
  finUsernotif(@Query('userId') userId: number) {
    return this.notificationsService.findUserNotif(userId);
  }

  @Patch(':id')
  update(@Body() ids: string[]) {
    return this.notificationsService.markMultipleAsRead(ids);
  }

  @Delete()
  remove(@Query('userId') userId: number) {
    return this.notificationsService.deleteAll(userId);
  }
}
