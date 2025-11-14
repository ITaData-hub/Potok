import { Injectable, Logger } from '@nestjs/common';
import { StateMatchAlgorithm, Task, UserState, CircadianContext } from '../logic/state-match-algorithm';

export interface PrioritizedTask {
  task: Task;
  calculated_priority: number;
  state_match_score: number;
  recommendation: string;
  should_defer: boolean;
  completion_probability?: number;
}

@Injectable()
export class PriorityCalculatorService {
  private readonly logger = new Logger(PriorityCalculatorService.name);

  constructor(private readonly stateMatchAlgorithm: StateMatchAlgorithm) {}

  /**
   * Приоритизация задач с учетом состояния
   * 
   * Формула:
   * Calculated-Priority = State-Match × 0.50 + Priority × 0.35 + Deadline-Urgency × 0.15
   */
  async prioritizeTasks(
    tasks: Task[],
    userState: UserState,
    circadian: CircadianContext,
  ): Promise<PrioritizedTask[]> {
    this.logger.debug(`Prioritizing ${tasks.length} tasks`);

    // Рассчитываем state match для всех задач
    const withStateMatch = this.stateMatchAlgorithm.calculateBatchStateMatch(
      tasks,
      userState,
      circadian,
    );

    // Добавляем calculated priority
    const prioritized: PrioritizedTask[] = withStateMatch.map((item) => {
      const priorityValue = this.getPriorityValue(item.task.priority);
      const deadlineUrgency = this.calculateDeadlineUrgency(item.task.deadline);
      
      // Calculated Priority = State-Match × 0.50 + Priority × 0.35 + Deadline × 0.15
      const calculatedPriority =
        item.stateMatch.score * 0.5 +
        priorityValue * 0.35 +
        deadlineUrgency * 0.15;

      // Расчет вероятности завершения (эвристически)
      const completionProbability = this.estimateCompletionProbability(
        item.task,
        userState,
        item.stateMatch.score,
      );

      return {
        task: item.task,
        calculated_priority: Number((calculatedPriority * 10).toFixed(2)), // 0-10 scale
        state_match_score: item.stateMatch.score,
        recommendation: item.stateMatch.recommendation,
        should_defer: item.stateMatch.should_defer,
        completion_probability: completionProbability,
      };
    });

    // Сортируем по calculated_priority (от высшего к низшему)
    prioritized.sort((a, b) => b.calculated_priority - a.calculated_priority);

    return prioritized;
  }

  /**
   * Получение числового значения приоритета
   */
  private getPriorityValue(priority: string): number {
    const priorityMap = {
      high: 1.0,
      medium: 0.6,
      low: 0.3,
    };
    return priorityMap[priority] || 0.6;
  }

  /**
   * Расчет срочности дедлайна
   */
  private calculateDeadlineUrgency(deadline?: string): number {
    if (!deadline) return 0.2;

    const now = new Date();
    const deadlineDate = new Date(deadline);
    const daysUntil = (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

    if (daysUntil < 0) return 1.0; // Просрочено
    if (daysUntil < 1) return 1.0; // Сегодня
    if (daysUntil <= 3) return 0.6; // 1-3 дня
    if (daysUntil <= 7) return 0.3; // 3-7 дней
    return 0.1; // > 7 дней
  }

  /**
   * Эвристическая оценка вероятности завершения задачи
   * 
   * Факторы:
   * - State Match (50%)
   * - Сложность vs Энергия (30%)
   * - Время до дедлайна (20%)
   */
  private estimateCompletionProbability(
    task: Task,
    userState: UserState,
    stateMatchScore: number,
  ): number {
    let probability = 0;

    // 1. State Match (50%)
    probability += stateMatchScore * 0.5;

    // 2. Complexity vs Energy (30%)
    const complexityFactor = this.getComplexityFactor(task.complexity);
    const energyRatio = userState.energy / 10;
    
    if (energyRatio >= complexityFactor) {
      probability += 0.3;
    } else {
      probability += (energyRatio / complexityFactor) * 0.3;
    }

    // 3. Deadline urgency (20%)
    if (task.deadline) {
      const daysUntil = this.getDaysUntilDeadline(task.deadline);
      if (daysUntil >= 3) {
        probability += 0.2; // Достаточно времени
      } else if (daysUntil >= 1) {
        probability += 0.15; // Немного времени
      } else {
        probability += 0.05; // Срочно - может быть стресс
      }
    } else {
      probability += 0.15; // Нет дедлайна - умеренная вероятность
    }

    return Math.min(1, Math.max(0, probability));
  }

  private getComplexityFactor(complexity: string): number {
    const map = { high: 0.8, medium: 0.6, low: 0.4 };
    return map[complexity] || 0.6;
  }

  private getDaysUntilDeadline(deadline: string): number {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    return (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  }
}
