import { UserState } from './user-state.interface';

export enum BotStage {
  ONBOARDING_START = 'onboarding_start',
  ONBOARDING_SCHEDULE = 'onboarding_schedule',
  ONBOARDING_TIMEZONE = 'onboarding_timezone',
  ONBOARDING_NOTIFICATIONS = 'onboarding_notifications',
  ONBOARDING_COMPLETE = 'onboarding_complete',
  MAIN_MENU = 'main_menu',
  TEST_IN_PROGRESS = 'test_in_progress',
  TASK_CREATION = 'task_creation',
  MIT_SESSION = 'mit_session',
  POMODORO_SESSION = 'pomodoro_session',
  RECOVERY_MODE = 'recovery_mode',
}

export interface BotContext {
  userId: string | null; // Может быть null до аутентификации
  maxUserId: string;
  stage: BotStage;
  userState?: UserState;
  sessionData?: Record<string, any>;
  lastInteraction?: Date;
}
