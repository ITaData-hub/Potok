import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ITask,
  IUserState,
  IFutureForecasts,
  IWorkloadForecast,
  IInterruptionForecast,
  IEfficiencyFactors,
} from '../../../common/interfaces/task.interface';
import { addDays, format, getDay, getHours } from 'date-fns';

@Injectable()
export class ForecastService {
  private readonly logger = new Logger(ForecastService.name);
  private readonly circadianFactors: Record<number, number>;
  private readonly dayOfWeekFactors: Record<number, number>;
  private readonly workingSchedule: any;

  constructor(private readonly configService: ConfigService) {
    const algorithmConfig = this.configService.get('algorithm');
    this.circadianFactors = algorithmConfig.circadianFactors;
    this.dayOfWeekFactors = algorithmConfig.dayOfWeekFactors;
    this.workingSchedule = algorithmConfig.workingSchedule;
  }

  /**
   * Создает прогнозы на будущие дни
   */
  generateFutureForecasts(
    userState: IUserState,
    tasks: ITask[],
    daysAhead: number,
    correlationId: string,
  ): IFutureForecasts {
    this.logger.debug({
      message: 'Generating future forecasts',
      daysAhead,
      correlationId,
    });

    const energyForecast: Record<string, Record<number, number>> = {};
    const workloadForecast: Record<string, IWorkloadForecast> = {};
    const interruptionForecast: Record<string, IInterruptionForecast> = {};
    const efficiencyFactors: Record<string, IEfficiencyFactors> = {};

    for (let day = 0; day < daysAhead; day++) {
      const date = addDays(userState.currentTime, day);
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayOfWeek = getDay(date);

      // Прогноз энергии по часам
      energyForecast[dateStr] = this.forecastEnergyForDay(
        userState,
        dayOfWeek,
        day,
      );

      // Прогноз загрузки
      workloadForecast[dateStr] = this.forecastWorkloadForDay(tasks, date);

      // Прогноз прерываний
      interruptionForecast[dateStr] = this.forecastInterruptionsForDay(
        dayOfWeek,
        workloadForecast[dateStr],
      );

      // Факторы эффективности
      efficiencyFactors[dateStr] = this.calculateEfficiencyFactors(
        userState,
        dayOfWeek,
      );
    }

    this.logger.debug({
      message: 'Future forecasts generated',
      daysCount: daysAhead,
      correlationId,
    });

    return {
      energyForecast,
      workloadForecast,
      interruptionForecast,
      efficiencyFactors,
    };
  }

  /**
   * Прогноз энергии по часам для конкретного дня
   */
  private forecastEnergyForDay(
    userState: IUserState,
    dayOfWeek: number,
    daysFromNow: number,
  ): Record<number, number> {
    const hourlyEnergy: Record<number, number> = {};
    const baseEnergy = userState.energy;
    const energyTrend = userState.energyTrend || 0;

    // Прогнозируемая базовая энергия с учетом тренда
    const forecastBaseEnergy = Math.max(
      0,
      Math.min(100, baseEnergy + energyTrend * daysFromNow * 5),
    );

    for (let hour = 0; hour < 24; hour++) {
      const circadianFactor = this.circadianFactors[hour] || 1;
      const dayFactor = this.dayOfWeekFactors[dayOfWeek] || 1;

      // Итоговая энергия = базовая * циркадный фактор * фактор дня недели
      const energy = forecastBaseEnergy * circadianFactor * dayFactor;
      hourlyEnergy[hour] = Math.max(0, Math.min(100, Math.round(energy)));
    }

    return hourlyEnergy;
  }

  /**
   * Прогноз загрузки на день
   */
  private forecastWorkloadForDay(
    tasks: ITask[],
    date: Date,
  ): IWorkloadForecast {
    const dateStr = format(date, 'yyyy-MM-dd');
    
    // Фильтруем задачи, запланированные на этот день
    const tasksForDay = tasks.filter((task) => {
      if (!task.scheduledDates || task.scheduledDates.length === 0) {
        return false;
      }
      
      return task.scheduledDates.some((scheduled) => {
        const scheduledDateStr = format(scheduled.date, 'yyyy-MM-dd');
        return scheduledDateStr === dateStr;
      });
    });

    // Считаем общее время
    const scheduledMinutes = tasksForDay.reduce((sum, task) => {
      const scheduledForDay = task.scheduledDates.find(
        (s) => format(s.date, 'yyyy-MM-dd') === dateStr,
      );
      return sum + (scheduledForDay?.duration || 0);
    }, 0);

    // Доступное время в рабочий день (в минутах)
    const workStart = this.parseTime(this.workingSchedule.workStart);
    const workEnd = this.parseTime(this.workingSchedule.workEnd);
    const availableMinutes = (workEnd - workStart) * 60;

    return {
      scheduledMinutes,
      scheduledTasksCount: tasksForDay.length,
      availableMinutes,
    };
  }

  /**
   * Прогноз прерываний на день
   */
  private forecastInterruptionsForDay(
    dayOfWeek: number,
    workload: IWorkloadForecast,
  ): IInterruptionForecast {
    // Базовое количество прерываний в зависимости от дня недели
    const baseInterruptions: Record<number, number> = {
      0: 1, // Воскресенье
      1: 5, // Понедельник
      2: 4,
      3: 3,
      4: 4,
      5: 5, // Пятница
      6: 2, // Суббота
    };

    const expectedInterruptions = baseInterruptions[dayOfWeek] || 3;

    // Среднее время одного прерывания (минуты)
    const avgInterruptionDuration = 10;

    // Время восстановления после прерывания
    const avgRecoveryTime = 20;

    const expectedInterruptionDuration =
      expectedInterruptions * avgInterruptionDuration;
    const expectedRecoveryTime = expectedInterruptions * avgRecoveryTime;

    return {
      expectedInterruptions,
      expectedInterruptionDuration,
      expectedRecoveryTime,
    };
  }

  /**
   * Расчет факторов эффективности
   */
  private calculateEfficiencyFactors(
    userState: IUserState,
    dayOfWeek: number,
  ): IEfficiencyFactors {
    const dayOfWeekFactor = this.dayOfWeekFactors[dayOfWeek] || 1;
    
    // Средний циркадный фактор для рабочих часов
    const workHours = [9, 10, 11, 12, 14, 15, 16, 17];
    const avgCircadianFactor =
      workHours.reduce((sum, hour) => sum + this.circadianFactors[hour], 0) /
      workHours.length;

    // Фактор стресса (высокий стресс снижает эффективность)
    const stressFactor = Math.max(0, 1 - userState.stress / 200);

    // Фактор мотивации
    const motivationFactor = userState.motivation / 100;

    return {
      dayOfWeekFactor,
      circadianFactor: avgCircadianFactor,
      stressFactor,
      motivationFactor,
    };
  }

  /**
   * Парсинг времени из строки "HH:MM" в часы
   */
  private parseTime(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours + minutes / 60;
  }

  /**
   * Получение циркадного фактора для конкретного времени
   */
  getCircadianFactor(date: Date): number {
    const hour = getHours(date);
    return this.circadianFactors[hour] || 1;
  }

  /**
   * Получение фактора дня недели
   */
  getDayOfWeekFactor(date: Date): number {
    const dayOfWeek = getDay(date);
    return this.dayOfWeekFactors[dayOfWeek] || 1;
  }
}
