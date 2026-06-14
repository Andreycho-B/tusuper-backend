import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('push_subscriptions')
export class PushSubscription {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ type: 'int' })
  userId: number;

  @Column({ type: 'text' })
  endpoint: string;

  @Column({ type: 'text', nullable: true })
  p256dh: string | null;

  @Column({ type: 'text', nullable: true })
  auth: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;
}
