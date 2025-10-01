import { IsString } from 'class-validator';

export class CreateNotificationDto {
  @IsString()
  taskName: string;
  @IsString()
  approved: boolean;
  @IsString()
  userId: number;
}
