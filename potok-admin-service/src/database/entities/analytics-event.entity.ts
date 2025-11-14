import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('analytics_events')
@Index(['user_id', 'event_type'])
@Index(['created_at'])
export class AnalyticsEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  user_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  event_type: string;

  @Column({ type: 'jsonb', nullable: true })
  event_data: any;

  @CreateDateColumn()
  created_at: Date;
}
