import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ITask,
  IUserState,
  IFutureForecasts,
} from '../../../common/interfaces/task.interface';
import {
  IRecommendation,
  IWarning,
} from '../../../common/interfaces/distribution.interface';
import { WorkloadLevel } from '../../../common/constants';
import { format, differenceInHours } from 'date-fns';

@Injectable()
export class RecommendationService {
  private readonly logger = new Logger(RecommendationService.name);
  private readonly breaksConfig: any;
  private readonly workloadConfig: any;

  constructor(private readonly configService: ConfigService) {
    const algorithmConfig = this.configService.get('algorithm');
    this.breaksConfig = algorithmConfig.breaks;
    this.workloadConfig = algorithmConfig.workload;
  }

  /**
   * Генерация рекомендаций на основе распределения задач
   */
  generateRecommendations(
    scheduledTasks: ITask[],
    unfeasibleTasks: ITask[],
    userState: IUserState,
    forecasts: IFutureForecasts,
    correlationId: string,
  ): IRecommendation[] {
    this.logger.debug({
      message: 'Generating recommendations',
      scheduledCount: scheduledTasks.length,
      unfeasibleCount: unfeasibleTasks.length,
      correlationId,
    });

    const recommendations: IRecommendation[] = [];

    // Рекомендации по состоянию пользователя
    recommendations.push(...this.getUserStateRecommendations(userState));

    // Рекомендации по перерывам
    recommendations.push(...this.getBreakRecommendations(scheduledTasks));

    // Рекомендации по загрузке
    recommendations.push(
      ...this.getWorkloadRecommendations(scheduledTasks, forecasts),
    );

    // Рекомендации по невыполнимым задачам
    recommendations.push(...this.getUnfeasibleTasksRecommendations(unfeasibleTasks));

    // Рекомендации по дедлайнам
    recommendations.push(
      ...this.getDeadlineRecommendations(scheduledTasks, userState),
    );

    // Сортируем по приоритету
    recommendations.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    this.logger.debug({
      message: 'Recommendations generated',
      count: recommendations.length,
      correlationId,
    });

    return recommendations;
  }

  /**
   * Рекомендации по состоянию пользователя
   */
  private getUserStateRecommendations(userState: IUserState): IRecommendation[] {
    const recommendations: IRecommendation[] = [];

    // Низкая энергия
    if (userState.energy < 30) {
      recommendations.push({
        type: 'energy',
        message:
          'Уровень энергии очень низкий. Рекомендуется отдых или легкие задачи.',
        priority: 'high',
        data: { energy: userState.energy },
      });
    }

    // Высокий стресс
    if (userState.stress > 70) {
      recommendations.push({
        type: 'stress',
        message:
          'Высокий уровень стресса. Рекомендуется сделать перерыв или выполнить дыхательные упражнения.',
        priority: 'high',
        data: { stress: userState.stress },
      });
    }

    // Низкий фокус
    if (userState.focus < 40) {
      recommendations.push({
        type: 'focus',
        message:
          'Низкий уровень концентрации. Рекомендуется короткая прогулка или смена деятельности.',
        priority: 'medium',
        data: { focus: userState.focus },
      });
    }

    // Низкая мотивация
    if (userState.motivation < 40) {
      recommendations.push({
        type: 'motivation',
        message:
          'Низкая мотивация. Попробуйте начать с простой задачи для создания импульса.',
        priority: 'medium',
        data: { motivation: userState.motivation },
      });
    }

    return recommendations;
  }

  /**
   * Рекомендации по перерывам
   */
  private getBreakRecommendations(scheduledTasks: ITask[]): IRecommendation[] {
    const recommendations: IRecommendation[] = [];

    if (scheduledTasks.length === 0) {
      return recommendations;
    }

    // Проверяем наличие перерывов между задачами
    for (let i = 0; i < scheduledTasks.length - 1; i++) {
      const currentTask = scheduledTasks[i];
      const nextTask = scheduledTasks[i + 1];

      if (!currentTask.scheduledDates?.[0] || !nextTask.scheduledDates?.[0]) {
        continue;
      }

      const currentEnd = new Date(
        currentTask.scheduledDates[0].startTime.getTime() +
          currentTask.scheduledDates[0].duration * 60000,
      );
      const nextStart = nextTask.scheduledDates[0].startTime;

      const breakMinutes =
        (nextStart.getTime() - currentEnd.getTime()) / 60000;

      if (breakMinutes < this.breaksConfig.minBreakAfterTask) {
        recommendations.push({
          type: 'break',
          message: `Рекомендуется перерыв минимум ${this.breaksConfig.minBreakAfterTask} минут между задачами "${currentTask.title}" и "${nextTask.title}".`,
          priority: 'medium',
          data: {
            currentTask: currentTask.title,
            nextTask: nextTask.title,
            actualBreak: breakMinutes,
            recommendedBreak: this.breaksConfig.recommendedBreakAfterTask,
          },
        });
      }
    }

    // Проверяем общую продолжительность без длинных перерывов
    const totalScheduledMinutes = scheduledTasks.reduce(
      (sum, task) => sum + (task.scheduledDates?.[0]?.duration || 0),
      0,
    );

    if (totalScheduledMinutes > this.breaksConfig.maxFocusTimeWithoutBreak) {
      recommendations.push({
        type: 'break',
        message: `Общее время работы превышает ${this.breaksConfig.maxFocusTimeWithoutBreak} минут. Рекомендуется запланировать длинный перерыв (${this.breaksConfig.mandatoryBreakAfterMaxFocus} минут).`,
        priority: 'high',
        data: {
          totalMinutes: totalScheduledMinutes,
          maxWithoutBreak: this.breaksConfig.maxFocusTimeWithoutBreak,
        },
      });
    }

    return recommendations;
  }

  /**
   * Рекомендации по загрузке
   */
  private getWorkloadRecommendations(
    scheduledTasks: ITask[],
    forecasts: IFutureForecasts,
  ): IRecommendation[] {
    const recommendations: IRecommendation[] = [];

    // Анализируем загрузку по дням
    Object.entries(forecasts.workloadForecast).forEach(([dateStr, workload]) => {
      const workloadPercentage =
        (workload.scheduledMinutes / workload.availableMinutes) * 100;

      if (workloadPercentage > this.workloadConfig.overloadThreshold) {
        recommendations.push({
          type: 'workload',
          message: `Перегрузка на ${dateStr}: ${Math.round(workloadPercentage)}% загрузки. Рекомендуется перенести некоторые задачи.`,
          priority: 'critical',
          data: {
            date: dateStr,
            workloadPercentage,
            scheduledMinutes: workload.scheduledMinutes,
            availableMinutes: workload.availableMinutes,
          },
        });
      } else if (workloadPercentage > this.workloadConfig.loadedMin) {
        recommendations.push({
          type: 'workload',
          message: `Высокая загрузка на ${dateStr}: ${Math.round(workloadPercentage)}%. Будьте готовы к интенсивному дню.`,
          priority: 'high',
          data: {
            date: dateStr,
            workloadPercentage,
          },
        });
      } else if (workloadPercentage < this.workloadConfig.underloadThreshold) {
        recommendations.push({
          type: 'workload',
          message: `Низкая загрузка на ${dateStr}: ${Math.round(workloadPercentage)}%. Можно запланировать дополнительные задачи или личное время.`,
          priority: 'low',
          data: {
            date: dateStr,
            workloadPercentage,
          },
        });
      }
    });

    return recommendations;
  }

  /**
   * Рекомендации по невыполнимым задачам
   */
  private getUnfeasibleTasksRecommendations(
    unfeasibleTasks: ITask[],
  ): IRecommendation[] {
    const recommendations: IRecommendation[] = [];

    if (unfeasibleTasks.length > 0) {
      recommendations.push({
        type: 'unfeasible',
        message: `${unfeasibleTasks.length} задач не удалось запланировать. Рекомендуется пересмотреть дедлайны или делегировать задачи.`,
        priority: 'critical',
        data: {
          count: unfeasibleTasks.length,
          tasks: unfeasibleTasks.map((t) => ({
            id: t.id,
            title: t.title,
            deadline: t.deadline,
          })),
        },
      });

      // Индивидуальные рекомендации для критичных задач
      unfeasibleTasks
        .filter((task) => task.priority >= 4)
        .forEach((task) => {
          recommendations.push({
            type: 'unfeasible',
            message: `Критичная задача "${task.title}" не может быть запланирована до дедлайна. Требуется срочное вмешательство.`,
            priority: 'critical',
            task,
            data: {
              taskId: task.id,
              deadline: task.deadline,
            },
          });
        });
    }

    return recommendations;
  }

  /**
   * Рекомендации по дедлайнам
   */
  private getDeadlineRecommendations(
    scheduledTasks: ITask[],
    userState: IUserState,
  ): IRecommendation[] {
    const recommendations: IRecommendation[] = [];

    scheduledTasks.forEach((task) => {
      if (!task.scheduledDates?.[0]) {
        return;
      }

      const scheduledTime = task.scheduledDates[0].startTime;
      const hoursUntilDeadline = differenceInHours(
        task.deadline,
        scheduledTime,
      );

      // Задача запланирована слишком близко к дедлайну
      if (hoursUntilDeadline < 24 && task.priority >= 3) {
        recommendations.push({
          type: 'deadline',
          message: `Задача "${task.title}" запланирована менее чем за 24 часа до дедлайна. Рекомендуется выполнить раньше.`,
          priority: 'high',
          task,
          data: {
            hoursUntilDeadline,
            scheduledTime,
            deadline: task.deadline,
          },
        });
      }
    });

    return recommendations;
  }

  /**
   * Генерация предупреждений для отчета о выполнимости
   */
  generateWarnings(
    scheduledTasks: ITask[],
    unfeasibleTasks: ITask[],
    userState: IUserState,
    correlationId: string,
  ): IWarning[] {
    this.logger.debug({
      message: 'Generating warnings',
      correlationId,
    });

    const warnings: IWarning[] = [];

    // Предупреждения о невыполнимых задачах
    unfeasibleTasks.forEach((task) => {
      const hoursUntilDeadline = differenceInHours(
        task.deadline,
        userState.currentTime,
      );

      warnings.push({
        level: task.priority >= 4 ? 'critical' : 'high',
        taskId: task.id,
        taskTitle: task.title,
        reason: 'Не найдено подходящего временного слота до дедлайна',
        deadline: task.deadline,
        alternatives: [
          'Пересмотреть дедлайн',
          'Уменьшить оцениваемую длительность',
          'Делегировать задачу',
          'Разбить на подзадачи',
        ],
      });
    });

    // Предупреждения о рисках
    scheduledTasks.forEach((task) => {
      if (!task.scheduledDates?.[0]) {
        return;
      }

      const scheduledTime = task.scheduledDates[0].startTime;
      const hoursUntilExecution = differenceInHours(
        scheduledTime,
        userState.currentTime,
      );
      const hoursUntilDeadline = differenceInHours(
        task.deadline,
        scheduledTime,
      );

      // Задача запланирована в последний момент
      if (hoursUntilDeadline < 12 && task.priority >= 3) {
        warnings.push({
          level: 'high',
          taskId: task.id,
          taskTitle: task.title,
          reason: 'Задача запланирована в последний момент перед дедлайном',
          deadline: task.deadline,
          alternatives: ['Выполнить раньше при первой возможности'],
        });
      }
    });

    return warnings;
  }
}
