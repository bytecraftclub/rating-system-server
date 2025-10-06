import { IsBoolean, IsNumber, IsString } from 'class-validator';

export class CreateNotificationDto {
  @IsString()
  taskName: string;
  @IsBoolean()
  approved: boolean;
  @IsNumber()
  userId: number;
}
