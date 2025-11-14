import { ITask, ITimeSlot } from './task.interface';

export interface IDistributionRequest {
  userId: string;
  energy: number;
  focus: number;
  motivation: number;
  stress: number;
  circadianFactor?: number;
  tasks?: ITask[];
}

export interface IDistributionResult {
  userId: string;
  scheduledTasks: ITask[];
  unfeasibleTasks: ITask[];
  mit?: ITask; // Most Important Task
  recommendations: IRecommendation[];
  feasibilityReport: IFeasibilityReport;
  metadata: {
    calculatedAt: Date;
    totalProcessingTime: number; // ms
    correlationId: string;
  };
}

export interface IRecommendation {
  type: string;
  message: string;
  priority: string;
  task?: ITask;
  data?: any;
}

export interface IFeasibilityReport {
  totalTasks: number;
  scheduledCount: number;
  unfeasibleCount: number;
  warnings: IWarning[];
  workloadAnalysis: IWorkloadAnalysis[];
}

export interface IWarning {
  level: string;
  taskId?: string;
  taskTitle?: string;
  reason: string;
  deadline?: Date;
  earliestPossibleCompletion?: Date;
  alternatives?: string[];
}

export interface IWorkloadAnalysis {
  date: string;
  usedMinutes: number;
  availableMinutes: number;
  workloadPercentage: number;
  isOverloaded: boolean;
  level: string;
}

export interface ITaskScore {
  task: ITask;
  urgency: number;
  importance: number;
  stateMatch: number;
  completionProbability: number;
  normalizedPriority: number;
  reason: string;
}
