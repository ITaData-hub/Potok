export enum TaskStatus {
    PENDING = 'pending',
    IN_PROGRESS = 'in_progress',
    COMPLETED = 'completed',
    CANCELLED = 'cancelled',
  }
  
  export interface Task {
    id: string;
    userId: string;
    title: string;
    description?: string;
    priority: number; // 1-5
    deadline?: Date;
    estimatedDuration: number; // минуты
    complexity: number; // 1-10
    requiredEnergy: number; // 1-10
    requiredFocus: number; // 1-10
    status: TaskStatus;
    category?: string;
    createdAt: Date;
    completedAt?: Date;
  }
  
  export interface MITRecommendation {
    task: Task;
    matchScore: number; // 0-100
    reason: string;
    optimalTime: {
      start: Date;
      end: Date;
    };
  }
  