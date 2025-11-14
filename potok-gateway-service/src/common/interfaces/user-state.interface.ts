export enum UIMode {
    PEAK = 'PEAK', // Энергия 8-10, Фокус 80-100%
    NORMAL = 'NORMAL', // Энергия 5-7, Фокус 60-80%
    LOW = 'LOW', // Энергия 3-4, Фокус 40-60%
    CRITICAL = 'CRITICAL', // Стресс >70 или Энергия <20
  }
  
  export interface UserState {
    userId: string;
    energy: number; // 0-100
    focus: number; // 0-100
    stress: number; // 0-100
    motivation: number; // 0-100
    currentTime: Date;
    circadianFactor: number; // 0.5-1.5
    uiMode: UIMode;
    lastTestTime?: Date;
    nextTestTime?: Date;
  }
  
  export interface TestResult {
    testType: 'energy' | 'focus' | 'motivation' | 'stress';
    score: number;
    timestamp: Date;
    rawAnswers: any;
    interpretation: string;
    recommendations: string[];
  }
  