import { FileUpload } from 'src/file-upload/entities/file-upload.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  BeforeInsert,
  PrimaryColumn,
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
  score: number;
  @Column()
  refreshtoken: string;

  @Column({ type: 'timestamp', nullable: true })
  lastfileupload: Date;

  @OneToMany(() => FileUpload, (file) => file.user, { eager: true })
  files: FileUpload[];

  @BeforeInsert()
  setDefaultLastFileUpload() {
    if (!this.lastfileupload) {
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      this.lastfileupload = twoDaysAgo;
    }
  }
}
