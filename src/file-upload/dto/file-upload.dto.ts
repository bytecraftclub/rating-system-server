import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateFileUploadDto {
  @IsString()
  @IsOptional()
  originalName?: string;

  @IsString()
  @IsOptional()
  mimeType?: string;

  @IsNumber()
  @IsOptional()
  fileSize?: any;

  @IsString()
  @IsNotEmpty()
  taskTitle: string;

  @IsNumber()
  @IsNotEmpty()
  userId: number;

  @IsString()
  @IsOptional()
  fileUrl?: string;
}
