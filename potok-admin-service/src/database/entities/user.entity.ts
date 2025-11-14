import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('users')
@Index(['max_user_id'], { unique: true })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  max_user_id: string;

  @Column({ nullable: true })
  username: string;

  @Column({ nullable: true })
  first_name: string;

  @Column({ nullable: true })
  last_name: string;

  @Column({ default: false })
  onboarding_completed: boolean;

  @Column({ type: 'timestamp', nullable: true })
  onboarded_at: Date;

  // ✅ ДОБАВИТЬ ЭТИ ПОЛЯ:
  @Column({ type: 'varchar', length: 20, default: 'NORMAL', nullable: true })
  ui_mode: string; // PEAK, NORMAL, LOW, CRITICAL

  @Column({ type: 'timestamp', nullable: true })
  last_test_at: Date;

  @Column({ nullable: true })
  timezone: string; // Полезно для планирования тестов

  @Column({ type: 'jsonb', nullable: true })
  metadata: any;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
