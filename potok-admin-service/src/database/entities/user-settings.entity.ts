import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, OneToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('user_settings')
export class UserSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', unique: true }) // ТОЛЬКО unique: true БЕЗ @Index
  @OneToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user_id: string;

  @Column({ type: 'boolean', default: true })
  notifications_enabled: boolean;

  @Column({ type: 'boolean', default: true })
  test_reminders: boolean;

  @Column({ type: 'time', default: '09:00' })
  work_start_time: string;

  @Column({ type: 'time', default: '18:00' })
  work_end_time: string;

  @Column({ type: 'jsonb', nullable: true })
  preferences: Record<string, any>;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
