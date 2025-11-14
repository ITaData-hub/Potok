import { Injectable, Logger } from '@nestjs/common';

export interface UserState {
  energy: number;
  focus: number;
  motivation: number;
  stress: number;
  energy_adjusted: number;
  focus_adjusted: number;
}

export interface Task {
  id: string;
  title: string;
  priority: string;
  complexity: string;
  required_energy: number;
  required_focus: number;
  estimated_duration: number;
  deadline?: string;
  [key: string]: any;
}

export interface CircadianContext {
  current_factor: number;
  phase: string;
  is_peak_time: boolean;
}

export interface StateMatchResult {
  score: number;
  breakdown: {
    energy_match: number;
    focus_match: number;
    stress_penalty: number;
    motivation_bonus: number;
  };
  should_defer: boolean;
  recommendation: string;
}

@Injectable()
export class StateMatchAlgorithm {
  private readonly logger = new Logger(StateMatchAlgorithm.name);

  /**
   * Главный метод расчета State-Match Score
   * 
   * Формула:
   * State-Match = (Energy-Match × 0.4 + Focus-Match × 0.4 + Motivation-Bonus × 0.1 - Stress-Penalty × 0.1)
   * 
   * Где:
   * - Energy-Match = 1 - |UserEnergy - TaskRequiredEnergy| / 10
   * - Focus-Match = 1 - |UserFocus - TaskRequiredFocus| / 100
   * - Motivation-Bonus = UserMotivation / 10
   * - Stress-Penalty = UserStress / 10
   */
  calculateStateMatch(
    task: Task,
    userState: UserState,
    circadian: CircadianContext,
  ): StateMatchResult {
    // Используем adjusted значения с учетом циркадных ритмов
    const userEnergy = userState.energy_adjusted || userState.energy;
    const userFocus = userState.focus_adjusted || userState.focus;

    // Energy Match: 1 - |UserEnergy - TaskRequiredEnergy| / 10
    const energyDiff = Math.abs(userEnergy - task.required_energy);
    const energyMatch = Math.max(0, 1 - energyDiff / 10);

    // Focus Match: 1 - |UserFocus - TaskRequiredFocus| / 100
    const focusDiff = Math.abs(userFocus - task.required_focus);
    const focusMatch = Math.max(0, 1 - focusDiff / 100);

    // Motivation Bonus: UserMotivation / 10
    const motivationBonus = userState.motivation / 10;

    // Stress Penalty: UserStress / 10
    const stressPenalty = userState.stress / 10;

    // Итоговый score
    const score = Math.max(
      0,
      Math.min(
        1,
        energyMatch * 0.4 +
        focusMatch * 0.4 +
        motivationBonus * 0.1 -
        stressPenalty * 0.1,
      ),
    );

    // Определяем, нужно ли отложить задачу
    const shouldDefer = this.shouldDeferTask(score, task, userState);

    // Генерируем рекомендацию
    const recommendation = this.generateRecommendation(
      score,
      task,
      userState,
      circadian,
      { energyMatch, focusMatch },
    );

    this.logger.debug(
      `State-Match for task ${task.id}: score=${score.toFixed(3)}, defer=${shouldDefer}`,
    );

    return {
      score,
      breakdown: {
        energy_match: energyMatch,
        focus_match: focusMatch,
        stress_penalty: stressPenalty,
        motivation_bonus: motivationBonus,
      },
      should_defer: shouldDefer,
      recommendation,
    };
  }

  /**
   * Пакетный расчет для списка задач
   */
  calculateBatchStateMatch(
    tasks: Task[],
    userState: UserState,
    circadian: CircadianContext,
  ): Array<{ task: Task; stateMatch: StateMatchResult }> {
    return tasks.map((task) => ({
      task,
      stateMatch: this.calculateStateMatch(task, userState, circadian),
    }));
  }

  /**
   * Определение необходимости отложить задачу
   */
  private shouldDeferTask(score: number, task: Task, userState: UserState): boolean {
    // Отложить если:
    // 1. Score < 0.3 (очень низкое соответствие)
    // 2. Высокая сложность + низкая энергия
    // 3. Высокий стресс (> 7) + высокая сложность

    if (score < 0.3) return true;

    if (task.complexity === 'high' && userState.energy < 5) return true;

    if (userState.stress > 7 && task.complexity === 'high') return true;

    return false;
  }

  /**
   * Генерация персональной рекомендации
   */
  private generateRecommendation(
    score: number,
    task: Task,
    userState: UserState,
    circadian: CircadianContext,
    matches: { energyMatch: number; focusMatch: number },
  ): string {
    if (score >= 0.8) {
      if (circadian.is_peak_time) {
        return 'Отлично подходит! Сейчас ваше пиковое время — приступайте прямо сейчас!';
      }
      return 'Отлично подходит под ваше текущее состояние!';
    }

    if (score >= 0.6) {
      return 'Хорошо подходит. Можете приступать к выполнению.';
    }

    if (score >= 0.4) {
      if (matches.energyMatch < 0.5) {
        return 'Умеренное соответствие. Лучше подойдет когда уровень энергии повысится.';
      }
      if (matches.focusMatch < 0.5) {
        return 'Умеренное соответствие. Рекомендуется выполнять в часы лучшей концентрации.';
      }
      return 'Умеренное соответствие. Можно выполнить, но будьте готовы к усилиям.';
    }

    // score < 0.4
    if (userState.stress > 7) {
      return 'Низкое соответствие. Сначала снизьте уровень стресса — сделайте перерыв.';
    }

    if (task.complexity === 'high' && userState.energy < 5) {
      return 'Низкое соответствие. Отложите на утро или после отдыха — задача требует больше энергии.';
    }

    if (matches.focusMatch < 0.3) {
      return 'Низкое соответствие. Эта задача требует высокой концентрации — лучше выполнить в пиковые часы.';
    }

    return 'Низкое соответствие. Рекомендуется отложить на более подходящее время.';
  }

  /**
   * Расчет circadian bonus для задачи
   */
  calculateCircadianBonus(
    task: Task,
    circadian: CircadianContext,
  ): number {
    if (!circadian.is_peak_time) return 0;

    // Бонус для сложных задач в пиковое время
    if (task.complexity === 'high') return 0.15;
    if (task.complexity === 'medium') return 0.10;
    return 0.05;
  }
}
