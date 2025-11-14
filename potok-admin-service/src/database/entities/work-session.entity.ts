// potok-admin-service/src/database/entities/work-session.entity.ts
import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  CreateDateColumn,
  UpdateDateColumn,
  Index, 
  ManyToOne, 
  JoinColumn 
} from 'typeorm';
import { User } from './user.entity';
import { Task } from './task.entity';

@Entity('work_sessions')
@Index(['user_id', 'start_time'])
@Index(['user_id', 'completed'])
export class WorkSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  user_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ nullable: true })
  @Index()
  task_id: string;

  @ManyToOne(() => Task)
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @Column({ 
    type: 'varchar', 
    length: 20,
    default: 'focus'
  })
  session_type: 'deepwork' | 'pomodoro' | 'focus';

  @Column({ type: 'timestamp' })
  start_time: Date;

  @Column({ type: 'integer' })
  planned_duration: number; // в минутах

  @Column({ type: 'timestamp', nullable: true })
  actual_end_time: Date;

  @Column({ type: 'boolean', default: false })
  @Index()
  completed: boolean;

  @Column({ type: 'integer', default: 0 })
  interruptions: number;

  @Column({ type: 'integer', nullable: true })
  focus_rating: number; // 1-5

  @Column({ type: 'text', nullable: true })
  completion_notes: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: any;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
