import { registerAs } from '@nestjs/config';

export default registerAs('algorithm', () => ({
  // Веса для расчета приоритета задачи
  weights: {
    urgency: {
      critical: 0.5,    // urgency > 80
      high: 0.35,       // urgency 50-80
      normal: 0.15,     // urgency < 50
    },
    importance: 0.2,
    stateMatch: 0.15,
    completionProb: 0.2,
  },

  // Пороги срочности
  urgency: {
    critical: 80,
    high: 50,
    medium: 20,
  },

  // Параметры рабочего расписания
  workingSchedule: {
    workStart: '09:00',
    workEnd: '18:00',
    breakTimes: [
      { start: '12:00', end: '13:00', type: 'lunch' },
      { start: '15:30', end: '15:45', type: 'short_break' },
    ],
    workingDays: [1, 2, 3, 4, 5], // Пн-Пт
    minBreakDuration: 5, // минут
    maxFocusTime: 90, // минут без перерыва
    pomodoroEnabled: false,
    pomodoroFocusPeriod: 25,
    pomodoroShortBreak: 5,
    pomodoroLongBreak: 15,
    pomodoroSessionsBeforeLongBreak: 4,
  },

  // Параметры для расчета соответствия задачи состоянию
  stateMatch: {
    energyWeight: 0.25,
    focusWeight: 0.25,
    stressWeight: 0.25,
    complexityWeight: 0.25,
    highStressThreshold: 70,
    lowComplexityThreshold: 4,
  },

  // Параметры для прогноза выполнения
  completionProbability: {
    taskVsTimeSlotWeight: 0.3,
    interruptionFactorWeight: 0.2,
    deadlineFactorWeight: 0.3,
    historyFactorWeight: 0.2,
    interruptionImpact: 5, // делитель для exp функции
  },

  // Параметры перерывов
  breaks: {
    minBreakAfterTask: 5,
    recommendedBreakAfterTask: 10,
    maxFocusTimeWithoutBreak: 90,
    mandatoryBreakAfterMaxFocus: 15,
    recoveryTimeAfterInterruption: 20,
    contextSwitchTime: 5,
    contextSwitchTimeDifferentCategory: 10,
    maxBreakDuration: 30,
  },

  // Параметры загрузки
  workload: {
    underloadThreshold: 50,
    optimalMin: 50,
    optimalMax: 75,
    loadedMin: 75,
    loadedMax: 85,
    overloadThreshold: 85,
  },

  // Параметры для перепланирования
  reschedule: {
    energyDeviationThreshold: 25,
    focusDeviationThreshold: 20,
    interruptionMultiplier: 1.5,
  },

  // Минимальная вероятность завершения задачи для слота
  completionThreshold: 0.6,

  // Максимум дней для поиска слота
  maxSearchDays: 30,

  // Минимальная длительность задачи (минуты)
  minTaskDuration: 15,

  // Циркадные факторы по часам
  circadianFactors: {
    0: 0.5, 1: 0.5, 2: 0.5, 3: 0.5, 4: 0.5, 5: 0.6,
    6: 0.7, 7: 0.9, 8: 1.1, 9: 1.3, 10: 1.3, 11: 1.2,
    12: 1.0, 13: 0.9, 14: 0.9, 15: 1.0, 16: 1.1, 17: 1.0,
    18: 0.9, 19: 0.8, 20: 0.7, 21: 0.6, 22: 0.6, 23: 0.5,
  },

  // Факторы дня недели
  dayOfWeekFactors: {
    0: 0.8,  // Воскресенье
    1: 0.6,  // Понедельник (синдром понедельника)
    2: 1.1,  // Вторник
    3: 1.2,  // Среда (пик)
    4: 1.1,  // Четверг
    5: 0.8,  // Пятница (спад)
    6: 0.7,  // Суббота
  },
}));
