import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ITask,
  IUserState,
  ITimeSlot,
  IFutureForecasts,
  IScheduledDate,
} from '../../../common/interfaces/task.interface';
import { ITaskScore } from '../../../common/interfaces/distribution.interface';
import { ScoringService } from './scoring.service';
import { ForecastService } from './forecast.service';
import {
  addDays,
  addMinutes,
  format,
  getDay,
  getHours,
  isWithinInterval,
  setHours,
  setMinutes,
} from 'date-fns';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);
  private readonly workingSchedule: any;
  private readonly maxSearchDays: number;
  private readonly completionThreshold: number;
  private readonly minTaskDuration: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly scoringService: ScoringService,
    private readonly forecastService: ForecastService,
  ) {
    const algorithmConfig = this.configService.get('algorithm');
    this.workingSchedule = algorithmConfig.workingSchedule;
    this.maxSearchDays = algorithmConfig.maxSearchDays;
    this.completionThreshold = algorithmConfig.completionThreshold;
    this.minTaskDuration = algorithmConfig.minTaskDuration;
  }

  /**
   * Планирование задачи в оптимальный слот
   */
  scheduleTask(
    task: ITask,
    userState: IUserState,
    forecasts: IFutureForecasts,
    scheduledTasks: ITask[],
    correlationId: string,
  ): { success: boolean; scheduledDate?: IScheduledDate; reason?: string } {
    this.logger.debug({
      message: 'Scheduling task',
      taskId: task.id,
      taskTitle: task.title,
      correlationId,
    });

    // Проверяем минимальную длительность
    if (task.estimatedDuration < this.minTaskDuration) {
      return {
        success: false,
        reason: `Задача слишком короткая (минимум ${this.minTaskDuration} минут)`,
      };
    }

    // Ищем оптимальный слот в течение maxSearchDays дней
    for (let day = 0; day < this.maxSearchDays; day++) {
      const date = addDays(userState.currentTime, day);
      const dayOfWeek = getDay(date);

      // Пропускаем нерабочие дни
      if (!this.workingSchedule.workingDays.includes(dayOfWeek)) {
        continue;
      }

      // Получаем доступные слоты на день
      const availableSlots = this.getAvailableSlots(date, scheduledTasks);

      // Оцениваем каждый слот
      for (const slot of availableSlots) {
        // Проверяем, что задача помещается в слот
        if (task.estimatedDuration > slot.duration) {
          continue;
        }

        // Проверяем дедлайн
        if (slot.endTime > task.deadline) {
          continue;
        }

        // Рассчитываем вероятность завершения
        const scores = this.scoringService.calculateTaskScores(
          [task],
          {
            ...userState,
            currentTime: slot.startTime,
            currentHour: getHours(slot.startTime),
            currentWeekday: dayOfWeek,
          },
          forecasts,
          slot,
          correlationId,
        );

        const taskScore = scores[0];

        // Проверяем порог завершения
        if (taskScore.completionProbability >= this.completionThreshold * 100) {
          const scheduledDate: IScheduledDate = {
            date: slot.startTime,
            startTime: slot.startTime,
            duration: task.estimatedDuration,
          };

          this.logger.log({
            message: 'Task scheduled successfully',
            taskId: task.id,
            taskTitle: task.title,
            scheduledDate: format(slot.startTime, 'yyyy-MM-dd HH:mm'),
            score: taskScore.normalizedPriority,
            correlationId,
          });

          return { success: true, scheduledDate };
        }
      }
    }

    // Не удалось найти подходящий слот
    this.logger.warn({
      message: 'Failed to schedule task',
      taskId: task.id,
      taskTitle: task.title,
      reason: 'No suitable slot found',
      correlationId,
    });

    return {
      success: false,
      reason: 'Не удалось найти подходящий временной слот',
    };
  }

  /**
   * Получение доступных временных слотов на день
   */
  private getAvailableSlots(date: Date, scheduledTasks: ITask[]): ITimeSlot[] {
    const dateStr = format(date, 'yyyy-MM-dd');
    const slots: ITimeSlot[] = [];

    // Рабочее время
    const [startHour, startMinute] = this.workingSchedule.workStart
      .split(':')
      .map(Number);
    const [endHour, endMinute] = this.workingSchedule.workEnd
      .split(':')
      .map(Number);

    let currentSlotStart = setMinutes(setHours(date, startHour), startMinute);
    const workEnd = setMinutes(setHours(date, endHour), endMinute);

    // Получаем занятые интервалы (перерывы + запланированные задачи)
    const busyIntervals = this.getBusyIntervals(date, scheduledTasks);

    // Генерируем свободные слоты
    while (currentSlotStart < workEnd) {
      // Проверяем, не занят ли текущий момент
      const isBusy = busyIntervals.some((interval) =>
        isWithinInterval(currentSlotStart, interval),
      );

      if (!isBusy) {
        // Ищем конец свободного слота
        let slotEnd = addMinutes(currentSlotStart, this.minTaskDuration);
        
        while (slotEnd <= workEnd) {
          const isEndBusy = busyIntervals.some((interval) =>
            isWithinInterval(slotEnd, interval),
          );

          if (isEndBusy) {
            break;
          }

          slotEnd = addMinutes(slotEnd, 15); // Инкремент 15 минут
        }

        const duration = (slotEnd.getTime() - currentSlotStart.getTime()) / 60000;

        if (duration >= this.minTaskDuration) {
          slots.push({
            startTime: currentSlotStart,
            endTime: slotEnd,
            duration,
          });
        }

        currentSlotStart = slotEnd;
      } else {
        // Перепрыгиваем занятый интервал
        const busyInterval = busyIntervals.find((interval) =>
          isWithinInterval(currentSlotStart, interval),
        );
        
        if (busyInterval) {
          currentSlotStart = busyInterval.end;
        } else {
          currentSlotStart = addMinutes(currentSlotStart, 15);
        }
      }
    }

    return slots;
  }

  /**
   * Получение занятых интервалов (перерывы + задачи)
   */
  private getBusyIntervals(
    date: Date,
    scheduledTasks: ITask[],
  ): Array<{ start: Date; end: Date }> {
    const intervals: Array<{ start: Date; end: Date }> = [];
    const dateStr = format(date, 'yyyy-MM-dd');

    // Добавляем перерывы
    this.workingSchedule.breakTimes.forEach((breakTime) => {
      const [startHour, startMinute] = breakTime.start.split(':').map(Number);
      const [endHour, endMinute] = breakTime.end.split(':').map(Number);

      intervals.push({
        start: setMinutes(setHours(date, startHour), startMinute),
        end: setMinutes(setHours(date, endHour), endMinute),
      });
    });

    // Добавляем запланированные задачи
    scheduledTasks.forEach((task) => {
      if (task.scheduledDates) {
        task.scheduledDates.forEach((scheduled) => {
          if (format(scheduled.date, 'yyyy-MM-dd') === dateStr) {
            intervals.push({
              start: scheduled.startTime,
              end: addMinutes(scheduled.startTime, scheduled.duration),
            });
          }
        });
      }
    });

    // Сортируем по времени начала
    intervals.sort((a, b) => a.start.getTime() - b.start.getTime());

    return intervals;
  }

  /**
   * Планирование всех задач
   */
  scheduleAllTasks(
    tasks: ITask[],
    userState: IUserState,
    forecasts: IFutureForecasts,
    correlationId: string,
  ): { scheduled: ITask[]; unfeasible: ITask[] } {
    this.logger.log({
      message: 'Starting to schedule all tasks',
      taskCount: tasks.length,
      correlationId,
    });

    const scheduled: ITask[] = [];
    const unfeasible: ITask[] = [];

    // Сортируем задачи по приоритету
    const sortedTasks = [...tasks].sort((a, b) => {
      const urgencyA = this.scoringService['calculateUrgency'](
        a,
        userState.currentTime,
      );
      const urgencyB = this.scoringService['calculateUrgency'](
        b,
        userState.currentTime,
      );
      return urgencyB - urgencyA;
    });

    // Планируем по очереди
    for (const task of sortedTasks) {
      const result = this.scheduleTask(
        task,
        userState,
        forecasts,
        scheduled,
        correlationId,
      );

      if (result.success) {
        task.scheduledDates = [result.scheduledDate];
        task.status = 'scheduled';
        scheduled.push(task);
      } else {
        unfeasible.push(task);
        this.logger.warn({
          message: 'Task unfeasible',
          taskId: task.id,
          taskTitle: task.title,
          reason: result.reason,
          correlationId,
        });
      }
    }

    this.logger.log({
      message: 'Scheduling completed',
      scheduledCount: scheduled.length,
      unfeasibleCount: unfeasible.length,
      correlationId,
    });

    return { scheduled, unfeasible };
  }
}
