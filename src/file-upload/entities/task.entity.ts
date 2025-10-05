import {
  Column,
  Entity,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { FileUpload } from './file-upload.entity';
import { User } from 'src/user/entities/user.entity';

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

  @ManyToMany(() => User, (user) => user.tasks)
  users: User[];
}
