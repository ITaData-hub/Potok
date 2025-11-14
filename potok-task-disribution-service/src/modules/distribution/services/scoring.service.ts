import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ITask,
  IUserState,
  IFutureForecasts,
  ITimeSlot,
} from '../../../common/interfaces/task.interface';
import { ITaskScore } from '../../../common/interfaces/distribution.interface';
import { UrgencyLevel } from '../../../common/constants';

@Injectable()
export class ScoringService {
  private readonly logger = new Logger(ScoringService.name);
  private readonly weights: any;
  private readonly urgencyThresholds: any;
  private readonly stateMatchConfig: any;
  private readonly completionConfig: any;

  constructor(private readonly configService: ConfigService) {
    const algorithmConfig = this.configService.get('algorithm');
    this.weights = algorithmConfig.weights;
    this.urgencyThresholds = algorithmConfig.urgency;
    this.stateMatchConfig = algorithmConfig.stateMatch;
    this.completionConfig = algorithmConfig.completionProbability;
  }

  /**
   * Рассчитывает приоритетные оценки для всех задач
   */
  calculateTaskScores(
    tasks: ITask[],
    userState: IUserState,
    forecasts: IFutureForecasts,
    slot: ITimeSlot,
    correlationId: string,
  ): ITaskScore[] {
    this.logger.debug({
      message: 'Calculating task scores',
      taskCount: tasks.length,
      correlationId,
    });

    const scores = tasks.map((task) => {
      const urgency = this.calculateUrgency(task, userState.currentTime);
      const importance = this.calculateImportance(task);
      const stateMatch = this.calculateStateMatch(task, userState);
      const completionProbability = this.calculateCompletionProbability(
        task,
        userState,
        forecasts,
        slot,
      );

      const normalizedPriority = this.calculateNormalizedPriority(
        urgency,
        importance,
        stateMatch,
        completionProbability,
      );

      const reason = this.generateScoreReason(
        task,
        urgency,
        importance,
        stateMatch,
        completionProbability,
      );

      return {
        task,
        urgency,
        importance,
        stateMatch,
        completionProbability,
        normalizedPriority,
        reason,
      };
    });

    // Сортируем по приоритету (от большего к меньшему)
    scores.sort((a, b) => b.normalizedPriority - a.normalizedPriority);

    this.logger.debug({
      message: 'Task scores calculated',
      topTask: scores[0]?.task.title,
      topScore: scores[0]?.normalizedPriority,
      correlationId,
    });

    return scores;
  }

  /**
   * Расчет срочности задачи (0-100)
   */
  private calculateUrgency(task: ITask, currentTime: Date): number {
    const now = currentTime.getTime();
    const deadline = task.deadline.getTime();
    const timeLeft = deadline - now;

    // Если дедлайн уже прошел
    if (timeLeft <= 0) {
      return 100;
    }

    // Время до дедлайна в часах
    const hoursLeft = timeLeft / (1000 * 60 * 60);
    
    // Оцениваемая длительность задачи в часах
    const estimatedHours = task.estimatedDuration / 60;

    // Соотношение времени выполнения к оставшемуся времени
    const ratio = estimatedHours / hoursLeft;

    // Чем больше ratio, тем срочнее задача
    let urgency: number;

    if (ratio >= 0.8) {
      // Критично: менее 25% запаса времени
      urgency = 100;
    } else if (ratio >= 0.5) {
      // Высокая срочность: менее 50% запаса
      urgency = 80;
    } else if (ratio >= 0.3) {
      // Средняя срочность
      urgency = 60;
    } else if (ratio >= 0.1) {
      // Низкая срочность
      urgency = 40;
    } else {
      // Очень низкая срочность
      urgency = 20;
    }

    // Учитываем базовый приоритет задачи
    const priorityBoost = (task.priority - 1) * 5; // 0-20
    urgency = Math.min(100, urgency + priorityBoost);

    return Math.round(urgency);
  }

  /**
   * Расчет важности задачи (0-100)
   */
  private calculateImportance(task: ITask): number {
    // Базовая важность из приоритета (1-5 -> 20-100)
    let importance = task.priority * 20;

    // Бонусы за категорию
    const categoryBonus: Record<string, number> = {
      work: 10,
      health: 15,
      learning: 5,
      personal: 0,
      social: -5,
      other: 0,
    };

    importance += categoryBonus[task.category] || 0;

    // Ограничиваем диапазон
    return Math.max(0, Math.min(100, Math.round(importance)));
  }

  /**
   * Расчет соответствия задачи текущему состоянию пользователя (0-100)
   */
  private calculateStateMatch(task: ITask, userState: IUserState): number {
    const { energyWeight, focusWeight, stressWeight, complexityWeight } =
      this.stateMatchConfig;

    // Энергия: чем выше requiredEnergy задачи, тем больше нужна энергия
    const energyMatch =
      100 - Math.abs(userState.energy - task.requiredEnergy * 10);

    // Фокус: аналогично
    const focusMatch =
      100 - Math.abs(userState.focus - task.requiredFocus * 10);

    // Стресс: при высоком стрессе лучше простые задачи
    let stressMatch = 100;
    if (userState.stress > this.stateMatchConfig.highStressThreshold) {
      if (task.complexity > this.stateMatchConfig.lowComplexityThreshold) {
        stressMatch = 100 - (task.complexity - 4) * 15;
      }
    }

    // Сложность: баланс между вызовом и способностями
    const complexityMatch =
      100 - Math.abs(userState.focus - task.complexity * 10);

    const stateMatch =
      energyMatch * energyWeight +
      focusMatch * focusWeight +
      stressMatch * stressWeight +
      complexityMatch * complexityWeight;

    return Math.max(0, Math.min(100, Math.round(stateMatch)));
  }

  /**
   * Расчет вероятности завершения задачи в слоте (0-100)
   */
  private calculateCompletionProbability(
    task: ITask,
    userState: IUserState,
    forecasts: IFutureForecasts,
    slot: ITimeSlot,
  ): number {
    const { taskVsTimeSlotWeight, interruptionFactorWeight, deadlineFactorWeight } =
      this.completionConfig;

    // 1. Соответствие длительности задачи и слота
    const taskDuration = task.estimatedDuration;
    const slotDuration = slot.duration;
    
    let durationFit: number;
    if (taskDuration <= slotDuration) {
      durationFit = 100;
    } else {
      // Задача длиннее слота
      durationFit = (slotDuration / taskDuration) * 100;
    }

    // 2. Фактор прерываний
    const slotDate = slot.startTime.toISOString().split('T')[0];
    const interruptionData = forecasts.interruptionForecast[slotDate];
    
    let interruptionFactor = 100;
    if (interruptionData) {
      const totalLostTime =
        interruptionData.expectedInterruptionDuration +
        interruptionData.expectedRecoveryTime;
      
      const effectiveTime = slotDuration - totalLostTime;
      if (effectiveTime < taskDuration) {
        interruptionFactor = Math.max(0, (effectiveTime / taskDuration) * 100);
      }
    }

    // 3. Фактор дедлайна (чем ближе, тем важнее успеть)
    const urgency = this.calculateUrgency(task, userState.currentTime);
    const deadlineFactor = Math.min(100, urgency);

    // 4. Итоговая вероятность
    const completionProb =
      durationFit * taskVsTimeSlotWeight +
      interruptionFactor * interruptionFactorWeight +
      deadlineFactor * deadlineFactorWeight +
      20; // базовая вероятность

    return Math.max(0, Math.min(100, Math.round(completionProb)));
  }

  /**
   * Расчет нормализованного приоритета (0-100)
   */
  private calculateNormalizedPriority(
    urgency: number,
    importance: number,
    stateMatch: number,
    completionProbability: number,
  ): number {
    let urgencyWeight: number;

    if (urgency > this.urgencyThresholds.critical) {
      urgencyWeight = this.weights.urgency.critical;
    } else if (urgency > this.urgencyThresholds.high) {
      urgencyWeight = this.weights.urgency.high;
    } else {
      urgencyWeight = this.weights.urgency.normal;
    }

    const normalizedPriority =
      urgency * urgencyWeight +
      importance * this.weights.importance +
      stateMatch * this.weights.stateMatch +
      completionProbability * this.weights.completionProb;

    return Math.round(normalizedPriority * 100) / 100;
  }

  /**
   * Генерация описания причины оценки
   */
  private generateScoreReason(
    task: ITask,
    urgency: number,
    importance: number,
    stateMatch: number,
    completionProbability: number,
  ): string {
    const reasons: string[] = [];

    if (urgency > this.urgencyThresholds.critical) {
      reasons.push('критический дедлайн');
    } else if (urgency > this.urgencyThresholds.high) {
      reasons.push('близкий дедлайн');
    }

    if (importance >= 80) {
      reasons.push('высокая важность');
    }

    if (stateMatch >= 80) {
      reasons.push('отлично подходит текущему состоянию');
    } else if (stateMatch < 40) {
      reasons.push('не соответствует текущему состоянию');
    }

    if (completionProbability >= 80) {
      reasons.push('высокая вероятность завершения');
    } else if (completionProbability < 50) {
      reasons.push('низкая вероятность завершения в текущем слоте');
    }

    return reasons.length > 0 ? reasons.join(', ') : 'стандартный приоритет';
  }

  /**
   * Определение уровня срочности
   */
  getUrgencyLevel(urgency: number): UrgencyLevel {
    if (urgency >= this.urgencyThresholds.critical) {
      return UrgencyLevel.CRITICAL;
    } else if (urgency >= this.urgencyThresholds.high) {
      return UrgencyLevel.HIGH;
    } else if (urgency >= this.urgencyThresholds.medium) {
      return UrgencyLevel.MEDIUM;
    } else {
      return UrgencyLevel.LOW;
    }
  }
}
