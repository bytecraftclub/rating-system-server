// mark-as-read.dto.ts
import { IsArray, IsString, ArrayMinSize } from 'class-validator';

export class MarkAsReadDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  ids: string[];
}
