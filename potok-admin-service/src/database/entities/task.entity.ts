import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('tasks')
@Index(['user_id', 'status'])
@Index(['user_id', 'deadline'])
@Index(['user_id', 'priority'])
@Index(['created_at'])
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  user_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: ['pending', 'in_progress', 'completed', 'cancelled'],
    default: 'pending',
  })
  status: string;

  @Column({
    type: 'enum',
    enum: ['high', 'medium', 'low'],
    default: 'medium',
  })
  priority: string;

  @Column({
    type: 'enum',
    enum: ['high', 'medium', 'low'],
    default: 'medium',
  })
  complexity: string;

  @Column({ type: 'decimal', precision: 3, scale: 1, default: 5.0 })
  required_energy: number;

  @Column({ type: 'integer', default: 50 })
  required_focus: number;

  @Column({ type: 'integer', default: 60 })
  estimated_duration: number;

  @Column({ type: 'timestamp', nullable: true })
  deadline: Date;

  @Column({ type: 'timestamp', nullable: true })
  started_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  completed_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  cancelled_at: Date;

  @Column({ type: 'jsonb', nullable: true })
  tags: string[];

  @Column({ type: 'jsonb', nullable: true })
  metadata: any;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
