import { Injectable, Logger } from '@nestjs/common';
import { StateMatchAlgorithm, Task, UserState, CircadianContext } from '../logic/state-match-algorithm';

export interface MITResult {
  taskId: string;
  title: string;
  description: string;
  priority_score: number;
  state_match_score: number;
  deadline_urgency: number;
  circadian_bonus: number;
  final_score: number;
  reason: string;
  recommended_time: string;
  estimated_duration: number;
}

@Injectable()
export class MitCalculatorService {
  private readonly logger = new Logger(MitCalculatorService.name);

  constructor(private readonly stateMatchAlgorithm: StateMatchAlgorithm) {}

  /**
   * Вычисление MIT (Most Important Task)
   * 
   * Формула приоритета:
   * MIT-Score = State-Match × 0.50 + Priority × 0.35 + Deadline-Urgency × 0.15 + Circadian-Bonus
   * 
   * Где:
   * - State-Match: соответствие задачи текущему состоянию (0-1)
   * - Priority: приоритет задачи (high=1.0, medium=0.6, low=0.3)
   * - Deadline-Urgency: срочность по дедлайну (0-1)
   * - Circadian-Bonus: бонус за выполнение в пиковое время (0-0.15)
   */
  async calculateMIT(
    tasks: Task[],
    userState: UserState,
    circadian: CircadianContext,
  ): Promise<MITResult | null> {
    if (!tasks || tasks.length === 0) {
      this.logger.warn('No tasks available for MIT calculation');
      return null;
    }

    // Фильтруем только pending и in_progress задачи
    const activeTasks = tasks.filter(
      (t) => t.status === 'pending' || t.status === 'in_progress',
    );

    if (activeTasks.length === 0) {
      this.logger.warn('No active tasks for MIT calculation');
      return null;
    }

    // Рассчитываем scores для всех задач
    const scoredTasks = activeTasks.map((task) => {
      const stateMatch = this.stateMatchAlgorithm.calculateStateMatch(
        task,
        userState,
        circadian,
      );

      const priorityScore = this.getPriorityScore(task.priority);
      const deadlineUrgency = this.calculateDeadlineUrgency(task.deadline);
      const circadianBonus = this.stateMatchAlgorithm.calculateCircadianBonus(task, circadian);

      // MIT Score = State-Match × 0.50 + Priority × 0.35 + Deadline × 0.15 + Circadian-Bonus
      const finalScore =
        stateMatch.score * 0.5 +
        priorityScore * 0.35 +
        deadlineUrgency * 0.15 +
        circadianBonus;

      return {
        task,
        stateMatch,
        priorityScore,
        deadlineUrgency,
        circadianBonus,
        finalScore,
      };
    });

    // Сортируем по finalScore
    scoredTasks.sort((a, b) => b.finalScore - a.finalScore);

    // Берем топ задачу
    const topTask = scoredTasks[0];

    if (!topTask) return null;

    // Генерируем причину выбора
    const reason = this.generateMITReason(topTask, circadian);

    // Определяем рекомендуемое время
    const recommendedTime = this.determineRecommendedTime(
      topTask.task,
      userState,
      circadian,
    );

    const mitResult: MITResult = {
      taskId: topTask.task.id,
      title: topTask.task.title,
      description: topTask.task.description || '',
      priority_score: topTask.priorityScore,
      state_match_score: topTask.stateMatch.score,
      deadline_urgency: topTask.deadlineUrgency,
      circadian_bonus: topTask.circadianBonus,
      final_score: topTask.finalScore,
      reason,
      recommended_time: recommendedTime,
      estimated_duration: topTask.task.estimated_duration || 60,
    };

    this.logger.log(
      `MIT calculated: ${mitResult.title} (score: ${mitResult.final_score.toFixed(3)})`,
    );

    return mitResult;
  }

  /**
   * Получение числового приоритета
   */
  private getPriorityScore(priority: string): number {
    const priorityMap = {
      high: 1.0,
      medium: 0.6,
      low: 0.3,
    };
    return priorityMap[priority] || 0.6;
  }

  /**
   * Расчет срочности по дедлайну
   * 
   * Формула:
   * - > 7 дней: 0.1
   * - 3-7 дней: 0.3
   * - 1-3 дня: 0.6
   * - < 1 день: 1.0
   * - Нет дедлайна: 0.2
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
   * Генерация причины выбора MIT
   */
  private generateMITReason(
    scored: {
      task: Task;
      stateMatch: any;
      priorityScore: number;
      deadlineUrgency: number;
      circadianBonus: number;
      finalScore: number;
    },
    circadian: CircadianContext,
  ): string {
    const reasons: string[] = [];

    // Приоритет
    if (scored.priorityScore >= 1.0) {
      reasons.push('Высокий приоритет');
    }

    // State match
    if (scored.stateMatch.score >= 0.7) {
      reasons.push('Отлично соответствует вашему текущему состоянию');
    } else if (scored.stateMatch.score >= 0.5) {
      reasons.push('Хорошо подходит под ваше состояние');
    }

    // Дедлайн
    if (scored.deadlineUrgency >= 0.6) {
      reasons.push('Приближается дедлайн');
    }

    // Циркадный ритм
    if (circadian.is_peak_time && scored.circadianBonus > 0) {
      reasons.push('Сейчас ваше пиковое время продуктивности');
    }

    // Если нет особых причин
    if (reasons.length === 0) {
      reasons.push('Наиболее сбалансированная задача для текущего момента');
    }

    return reasons.join(', ');
  }

  /**
   * Определение рекомендуемого времени выполнения
   */
  private determineRecommendedTime(
    task: Task,
    userState: UserState,
    circadian: CircadianContext,
  ): string {
    // Если сейчас пиковое время и задача подходит
    if (circadian.is_peak_time) {
      return 'Прямо сейчас (пиковое время)';
    }

    // Анализируем требования задачи
    if (task.complexity === 'high' || task.required_energy >= 7) {
      return '08:00-12:00 (утренний пик продуктивности)';
    }

    if (task.complexity === 'medium') {
      return '08:00-12:00 или 16:00-18:00 (пиковые периоды)';
    }

    // Легкие задачи
    return '12:00-14:00 или 18:00-20:00 (время для легких задач)';
  }
}
