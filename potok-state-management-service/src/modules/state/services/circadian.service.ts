import { Injectable, Logger } from '@nestjs/common';

export interface CircadianData {
  factor: number;
  phase: string;
  description: string;
}

type CircadianFactors = {
  [key: string]: CircadianData; // ДОБАВЛЕНО: index signature
};

@Injectable()
export class CircadianService {
  private readonly logger = new Logger(CircadianService.name);

  // Циркадные коэффициенты по ТЗ
  private readonly circadianFactors: CircadianFactors = {
    '06-08': { factor: 0.8, phase: 'WAKE_UP', description: 'Пробуждение' },
    '08-10': { factor: 1.2, phase: 'MORNING_PEAK', description: 'Утренний пик' },
    '10-12': { factor: 1.3, phase: 'MAXIMUM', description: 'Максимальная продуктивность' },
    '12-14': { factor: 1.0, phase: 'LUNCH', description: 'Обеденное время' },
    '14-16': { factor: 0.7, phase: 'AFTERNOON_DIP', description: 'Послеобеденный спад' },
    '16-18': { factor: 1.1, phase: 'EVENING_PEAK', description: 'Вечерний пик' },
    '18-22': { factor: 0.9, phase: 'EVENING', description: 'Вечер' },
    '22-06': { factor: 0.5, phase: 'NIGHT', description: 'Ночь' },
  };

  /**
   * Получить циркадный коэффициент для текущего времени
   */
  getCurrentCircadianFactor(): CircadianData {
    const now = new Date();
    return this.getCircadianFactorForTime(now);
  }

  /**
   * Получить циркадный коэффициент для конкретного времени
   */
  getCircadianFactorForTime(date: Date): CircadianData {
    const hour = date.getHours();
    const key = this.getTimeRangeKey(hour);
    const data = this.circadianFactors[key];

    return {
      factor: data.factor,
      phase: data.phase,
      description: data.description,
    };
  }

  /**
   * Прогноз циркадных факторов на весь день
   */
  getForecastForDay(date?: Date): Array<{ hour: number; factor: number; phase: string }> {
    const forecast = [];
    const baseDate = date || new Date();

    for (let hour = 0; hour < 24; hour++) {
      const testDate = new Date(baseDate);
      testDate.setHours(hour, 0, 0, 0);
      const circadianData = this.getCircadianFactorForTime(testDate);

      forecast.push({
        hour,
        factor: circadianData.factor,
        phase: circadianData.phase,
      });
    }

    return forecast;
  }

  /**
   * Получить периоды пиковой продуктивности
   */
  getPeakHours(): string[] {
    return ['08:00-10:00', '10:00-12:00', '16:00-18:00'];
  }

  /**
   * Определить, является ли текущее время пиковым
   */
  isPeakTime(date?: Date): boolean {
    const currentDate = date || new Date();
    const hour = currentDate.getHours();
    
    // Пиковые часы: 8-12 и 16-18
    return (hour >= 8 && hour < 12) || (hour >= 16 && hour < 18);
  }

  /**
   * Рекомендовать лучшее время для задачи по сложности
   */
  recommendTimeForTask(taskComplexity: 'high' | 'medium' | 'low'): string[] {
    const recommendations = {
      high: ['08:00-10:00', '10:00-12:00'], // Максимальная продуктивность
      medium: ['08:00-12:00', '16:00-18:00'], // Пиковые периоды
      low: ['12:00-14:00', '14:00-16:00', '18:00-20:00'], // Любое время
    };

    return recommendations[taskComplexity];
  }

  /**
   * Скорректировать score с учетом циркадного ритма
   */
  adjustScoreByCircadian(baseScore: number, date?: Date): number {
    const circadian = this.getCircadianFactorForTime(date || new Date());
    const adjusted = baseScore * circadian.factor;

    this.logger.debug(
      `Circadian adjustment: base=${baseScore}, factor=${circadian.factor}, adjusted=${adjusted}`,
    );

    return Number(adjusted.toFixed(1));
  }

  // ==================== Вспомогательные методы ====================

  private getTimeRangeKey(hour: number): string {
    if (hour >= 6 && hour < 8) return '06-08';
    if (hour >= 8 && hour < 10) return '08-10';
    if (hour >= 10 && hour < 12) return '10-12';
    if (hour >= 12 && hour < 14) return '12-14';
    if (hour >= 14 && hour < 16) return '14-16';
    if (hour >= 16 && hour < 18) return '16-18';
    if (hour >= 18 && hour < 22) return '18-22';
    return '22-06';
  }
}
