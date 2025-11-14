import { Injectable, Logger } from '@nestjs/common';
import { UIMode } from '../../../common/enums/ui-mode.enum';

export interface StateMetrics {
  energy: number;      // 0-10
  focus: number;       // 0-100
  motivation: number;  // 0-10
  stress: number;      // 0-10
}

@Injectable()
export class UiModeService {
  private readonly logger = new Logger(UiModeService.name);

  /**
   * Определить UI режим на основе метрик состояния
   * 
   * Правила по ТЗ:
   * - PEAK: energy >= 8 AND focus >= 70
   * - NORMAL: energy >= 5 AND focus >= 50
   * - LOW: energy >= 3 AND focus >= 30
   * - CRITICAL: energy < 3 OR stress > 7
   */
  determineUIMode(state: StateMetrics): UIMode {
    const { energy, focus, stress } = state;

    // Критическое состояние имеет высший приоритет
    if (energy < 3 || stress > 7) {
      this.logger.debug(`UI Mode: CRITICAL (energy=${energy}, stress=${stress})`);
      return UIMode.CRITICAL;
    }

    // Пиковое состояние
    if (energy >= 8 && focus >= 70) {
      this.logger.debug(`UI Mode: PEAK (energy=${energy}, focus=${focus})`);
      return UIMode.PEAK;
    }

    // Нормальное состояние
    if (energy >= 5 && focus >= 50) {
      this.logger.debug(`UI Mode: NORMAL (energy=${energy}, focus=${focus})`);
      return UIMode.NORMAL;
    }

    // Сниженное состояние
    this.logger.debug(`UI Mode: LOW (energy=${energy}, focus=${focus})`);
    return UIMode.LOW;
  }

  /**
   * Получить описание UI режима
   */
  getUIModeDescription(mode: UIMode): string {
    const descriptions = {
      [UIMode.PEAK]: 'Пиковая продуктивность — идеальное время для сложных задач',
      [UIMode.NORMAL]: 'Нормальное состояние — подходит для обычных задач',
      [UIMode.LOW]: 'Сниженная продуктивность — рекомендуются легкие задачи или отдых',
      [UIMode.CRITICAL]: 'Критическое состояние — необходим отдых и восстановление',
    };

    return descriptions[mode];
  }

  /**
   * Получить рекомендации по UI режиму
   */
  getRecommendationsForMode(mode: UIMode): string[] {
    const recommendations = {
      [UIMode.PEAK]: [
        'Используйте Deep Work режим для максимальной концентрации',
        'Отключите все уведомления и отвлечения',
        'Работайте над самыми важными и сложными задачами',
        'Это ваше золотое время — используйте его максимально эффективно',
      ],
      [UIMode.NORMAL]: [
        'Подходящее время для обычных задач',
        'Чередуйте работу с короткими перерывами',
        'Можете работать в обычном режиме',
        'Следите за уровнем концентрации',
      ],
      [UIMode.LOW]: [
        'Выполняйте простые рутинные задачи',
        'Делайте регулярные перерывы каждые 30-40 минут',
        'Рассмотрите короткую прогулку или легкую разминку',
        'Избегайте сложных решений',
      ],
      [UIMode.CRITICAL]: [
        '🚨 СРОЧНО: Прекратите работу и отдохните',
        'Сделайте длинный перерыв (минимум 30 минут)',
        'Выполните дыхательные упражнения или медитацию',
        'При продолжении высокого стресса обратитесь к специалисту',
        'Перенесите несрочные задачи на завтра',
      ],
    };

    return recommendations[mode];
  }

  /**
   * Определить цветовую схему для UI
   */
  getUIColorScheme(mode: UIMode): { primary: string; background: string; text: string } {
    const schemes = {
      [UIMode.PEAK]: {
        primary: '#10B981',    // Зеленый
        background: '#ECFDF5',
        text: '#065F46',
      },
      [UIMode.NORMAL]: {
        primary: '#3B82F6',    // Синий
        background: '#EFF6FF',
        text: '#1E40AF',
      },
      [UIMode.LOW]: {
        primary: '#F59E0B',    // Оранжевый
        background: '#FFFBEB',
        text: '#92400E',
      },
      [UIMode.CRITICAL]: {
        primary: '#EF4444',    // Красный
        background: '#FEF2F2',
        text: '#991B1B',
      },
    };

    return schemes[mode];
  }
}
