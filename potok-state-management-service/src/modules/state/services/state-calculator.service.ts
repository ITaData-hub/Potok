import { Injectable } from '@nestjs/common';
import { TestType } from '../../../common/enums/test-type.enum';
import { UIMode } from '../../../common/enums/ui-mode.enum';
import { UserState } from '../../../common/interfaces/user-state.interface';

@Injectable()
export class StateCalculatorService {
  /**
   * Расчет score для теста энергии (1-10)
   */
  calculateEnergyScore(answers: number[]): number {
    const weights = [0.4, 0.35, 0.25];
    const weightedSum = answers.reduce(
      (sum, answer, index) => sum + answer * weights[index],
      0,
    );
    return Math.round(weightedSum * 3.33 * 10) / 10;
  }

  /**
   * Расчет score для теста фокуса (0-100%)
   */
  calculateFocusScore(answers: number[]): number {
    const weights = [0.4, 0.4, 0.2];
    const weightedSum = answers.reduce(
      (sum, answer, index) => sum + answer * weights[index],
      0,
    );
    return Math.round(weightedSum * 33.33);
  }

  /**
   * Расчет score для теста мотивации (1-10)
   */
  calculateMotivationScore(answers: number[]): number {
    const weights = [0.35, 0.35, 0.3];
    const weightedSum = answers.reduce(
      (sum, answer, index) => sum + answer * weights[index],
      0,
    );
    return Math.round(weightedSum * 3.33 * 10) / 10;
  }

  /**
   * Расчет score для теста стресса (0-10, инвертированный)
   */
  calculateStressScore(answers: number[]): number {
    const weights = [0.35, 0.35, 0.3];
    const weightedSum = answers.reduce(
      (sum, answer, index) => sum + answer * weights[index],
      0,
    );
    return Math.round((10 - weightedSum * 3.33) * 10) / 10;
  }

  /**
   * Универсальный расчет score
   */
  calculateScore(testType: TestType, answers: number[]): number {
    switch (testType) {
      case TestType.ENERGY:
        return this.calculateEnergyScore(answers);
      case TestType.FOCUS:
        return this.calculateFocusScore(answers);
      case TestType.MOTIVATION:
        return this.calculateMotivationScore(answers);
      case TestType.STRESS:
        return this.calculateStressScore(answers);
      default:
        throw new Error(`Unknown test type: ${testType}`);
    }
  }

  /**
   * Нормализация score к 0-100 шкале
   */
  normalizeScore(testType: TestType, rawScore: number): number {
    switch (testType) {
      case TestType.ENERGY:
      case TestType.MOTIVATION:
        return Math.round(rawScore * 10); // 1-10 -> 0-100
      case TestType.FOCUS:
        return Math.round(rawScore); // already 0-100
      case TestType.STRESS:
        return Math.round(rawScore * 10); // 0-10 -> 0-100
      default:
        return rawScore;
    }
  }

  /**
   * Интерпретация результата теста
   */
  interpretScore(testType: TestType, score: number): string {
    const normalizedScore = this.normalizeScore(testType, score);

    switch (testType) {
      case TestType.ENERGY:
        if (normalizedScore >= 80) return 'Пиковая энергия';
        if (normalizedScore >= 50) return 'Нормальная энергия';
        if (normalizedScore >= 30) return 'Низкая энергия';
        return 'Критично низкая';

      case TestType.FOCUS:
        if (normalizedScore >= 80) return 'Высокий фокус';
        if (normalizedScore >= 60) return 'Средний фокус';
        if (normalizedScore >= 40) return 'Низкий фокус (рассеянность)';
        return 'Критично низкий';

      case TestType.MOTIVATION:
        if (normalizedScore >= 80) return 'Высокая мотивация';
        if (normalizedScore >= 50) return 'Средняя мотивация';
        if (normalizedScore >= 30) return 'Низкая мотивация';
        return 'Критично низкая';

      case TestType.STRESS:
        if (normalizedScore <= 30) return 'Низкий стресс';
        if (normalizedScore <= 60) return 'Средний стресс';
        if (normalizedScore <= 80) return 'Высокий стресс (внимание!)';
        return 'Критичный (режим восстановления)';

      default:
        return 'Неизвестно';
    }
  }

  /**
   * Определение UI режима
   */
  determineUIMode(state: UserState['state']): UIMode {
    // Критичное состояние (приоритет)
    if (state.stress >= 70 || state.energy <= 20) {
      return UIMode.CRITICAL;
    }

    // Пиковое состояние
    if (state.energy >= 80 && state.focus >= 80) {
      return UIMode.PEAK;
    }

    // Низкое состояние
    if (state.energy <= 40 || state.focus <= 40) {
      return UIMode.LOW;
    }

    // Нормальное состояние
    return UIMode.NORMAL;
  }

  /**
   * Расчет тренда (-1 to +1)
   */
  calculateTrend(current: number, previous: number, maxChange = 20): number {
    const change = current - previous;
    const normalized = change / maxChange;
    return Math.max(-1, Math.min(1, normalized));
  }
}
