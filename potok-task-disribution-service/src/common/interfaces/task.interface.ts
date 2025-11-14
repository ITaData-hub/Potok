export interface ITask {
    id: string;
    userId: string;
    title: string;
    description?: string;
    priority: number; // 1-5
    deadline: Date;
    estimatedDuration: number; // минуты
    category: string;
    complexity: number; // 1-10
    requiredEnergy: number; // 1-10
    requiredFocus: number; // 1-10
    status: string;
    stages?: ITaskStage[];
    scheduledDates?: IScheduledDate[];
    createdAt: Date;
    lastModified: Date;
  }
  
  export interface ITaskStage {
    stageId: string;
    name: string;
    duration: number; // минуты
    dependsOn: string[]; // IDs других стадий
    isSequential: boolean;
  }
  
  export interface IScheduledDate {
    date: Date;
    startTime: Date;
    duration: number;
    stageIds?: string[];
  }
  
  export interface IUserState {
    userId: string;
    energy: number; // 0-100
    focus: number; // 0-100
    stress: number; // 0-100
    motivation: number; // 0-100
    energyTrend?: number; // -1 to 1
    focusTrend?: number; // -1 to 1
    currentTime: Date;
    currentWeekday: number; // 0-6
    currentHour: number; // 0-23
    tasksToday?: ITask[];
    totalScheduledMinutes?: number;
    availableMinutesToday?: number;
  }
  
  export interface ITimeSlot {
    startTime: Date;
    endTime: Date;
    duration: number; // минуты
  }
  
  export interface IWorkingSchedule {
    workStart: string;
    workEnd: string;
    breakTimes: IBreakTime[];
    workingDays: number[];
    minBreakDuration: number;
    maxFocusTime: number;
    pomodoroEnabled: boolean;
  }
  
  export interface IBreakTime {
    start: string;
    end: string;
    type: string;
  }
  
  export interface IFutureForecasts {
    energyForecast: Record<string, Record<number, number>>;
    workloadForecast: Record<string, IWorkloadForecast>;
    interruptionForecast: Record<string, IInterruptionForecast>;
    efficiencyFactors: Record<string, IEfficiencyFactors>;
  }
  
  export interface IWorkloadForecast {
    scheduledMinutes: number;
    scheduledTasksCount: number;
    availableMinutes: number;
  }
  
  export interface IInterruptionForecast {
    expectedInterruptions: number;
    expectedInterruptionDuration: number;
    expectedRecoveryTime: number;
  }
  
  export interface IEfficiencyFactors {
    dayOfWeekFactor: number;
    circadianFactor: number;
    stressFactor: number;
    motivationFactor: number;
  }
  