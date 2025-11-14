import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('user_states')
@Index(['user_id', 'created_at'])
@Index(['user_id', 'test_type'])
@Index(['created_at'])
export class UserState {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  user_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    type: 'enum',
    enum: ['energy', 'focus', 'motivation', 'stress'],
  })
  test_type: string;

  @Column({ type: 'decimal', precision: 3, scale: 1 })
  energy: number;

  @Column({ type: 'integer' })
  focus: number;

  @Column({ type: 'decimal', precision: 3, scale: 1 })
  motivation: number;

  @Column({ type: 'decimal', precision: 3, scale: 1 })
  stress: number;

  @Column({ type: 'integer', default: 0 })
  test_count_today: number;

  @Column({ type: 'jsonb', nullable: true })
  test_answers: {
    q1: number;
    q2: number;
    q3: number;
  };

  @Column({ type: 'jsonb', nullable: true })
  metadata: any;

  @CreateDateColumn()
  created_at: Date;
}
