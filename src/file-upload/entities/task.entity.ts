import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { FileUpload } from './file-upload.entity';

@Entity('tasks')
export class task {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column()
  description: string;

  @Column()
  points: number;

  @OneToMany(() => FileUpload, (file) => file.task, { eager: true })
  files: FileUpload[];
}
