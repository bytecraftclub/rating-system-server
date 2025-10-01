import { User } from 'src/user/entities/user.entity';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn()
  id: string;

  @Column()
  message: string;

  @Column()
  read: boolean;

  @Column({ nullable: true })
  createdAt: Date;

  @ManyToOne(() => User, (user) => user.notifications, { eager: false })
  user: User;
}
