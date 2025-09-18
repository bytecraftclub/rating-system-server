import { IsOptional, IsString } from 'class-validator';

export class UpdateFileDto {
  @IsOptional()
  @IsString()
  originalName?: string;
}
