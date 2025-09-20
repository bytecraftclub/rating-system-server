import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateFileUploadDto {
  @IsString()
  @IsNotEmpty()
  originalName: string;

  @IsString()
  @IsNotEmpty()
  mimeType: string;

  @IsNumber()
  @IsNotEmpty()
  fileSize: number;

  @IsNumber()
  @IsOptional()
  taskId?: number;

  @IsNumber()
  @IsOptional()
  userId?: number;
}
