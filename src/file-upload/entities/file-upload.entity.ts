import { User } from 'src/user/entities/user.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  ManyToOne,
  ForeignKey,
  JoinColumn,
} from 'typeorm';
import { task } from './task.entity';

@Entity('file_uploads')
export class FileUpload {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  originalName: string;

  @Column()
  mimeType: string;

  @Column()
  fileSize: number;

  @Column({ type: 'bytea' })
  fileData: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.files, { eager: false })
  user: User;
  @Column()
  userId: number;

  @Column({ nullable: true })
  taskId: number;

  @ManyToOne(() => task, (task) => task.files, { eager: false })
  task: task;
}
