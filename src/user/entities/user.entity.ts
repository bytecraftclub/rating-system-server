import { FileUpload } from 'src/file-upload/entities/file-upload.entity';
import { task } from 'src/file-upload/entities/task.entity';
import { Notification } from 'src/notifications/entities/notification.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  BeforeInsert,
  PrimaryColumn,
  ManyToMany,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  googleId: string;

  @Column({ unique: true })
  email: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ nullable: true })
  avatar?: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: 0 })
  uploads: number;

  @Column({ default: 0 })
  score: number;
  @Column({ nullable: true })
  refreshtoken: string;
  @Column({ default: 'user' })
  role: string;

  @Column({ type: 'timestamp', nullable: true })
  lastfileupload: Date;

  @ManyToMany(() => task, (task) => task.user, { eager: true })
  tasks: task[];

  @OneToMany(() => FileUpload, (file) => file.user, { eager: true })
  files: FileUpload[];

  @OneToMany(() => Notification, (notification) => notification.user, {
    eager: true,
  })
  notifications: Notification[];

  @BeforeInsert()
  setDefaultLastFileUpload() {
    if (!this.lastfileupload) {
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      this.lastfileupload = twoDaysAgo;
    }
  }
}
