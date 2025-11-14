export const CORRELATION_ID_HEADER = 'x-correlation-id';
export const API_KEY_HEADER = 'x-api-key';

export enum TaskStatus {
  PENDING = 'pending',
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum TaskCategory {
  WORK = 'work',
  PERSONAL = 'personal',
  HEALTH = 'health',
  LEARNING = 'learning',
  SOCIAL = 'social',
  OTHER = 'other',
}

export enum UrgencyLevel {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export enum WorkloadLevel {
  UNDERLOAD = 'underload',
  OPTIMAL = 'optimal',
  LOADED = 'loaded',
  OVERLOAD = 'overload',
}

export const CACHE_KEYS = {
  USER_TASKS: (userId: string) => `tasks:user:${userId}`,
  USER_STATE: (userId: string) => `state:user:${userId}`,
  DISTRIBUTION_RESULT: (userId: string) => `distribution:user:${userId}`,
  WORKLOAD: (userId: string, date: string) => `workload:user:${userId}:${date}`,
  FORECASTS: (userId: string) => `forecasts:user:${userId}`,
};
