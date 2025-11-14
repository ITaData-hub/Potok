import { Injectable, Logger } from '@nestjs/common';
import { UIMode } from '../../common/enums/ui-mode.enum';
import { UiModeService } from '../state/services/ui-mode.service';
import { CircadianService } from '../state/services/circadian.service';

export interface RecommendationResponse {
  recommendations: string[];
  work_mode: WorkMode;
  break_needed: boolean;
  break_duration?: number;
  stress_relief_exercises?: string[];
  next_test_time?: string;
}

export enum WorkMode {
  DEEP_WORK = 'DEEP_WORK',
  POMODORO = 'POMODORO',
  RECOVERY = 'RECOVERY',
  NORMAL = 'NORMAL',
}

@Injectable()
export class RecommendationsService {
  private readonly logger = new Logger(RecommendationsService.name);

  constructor(
    private readonly uiModeService: UiModeService,
    private readonly circadianService: CircadianService,
  ) {}

  /**
   * Генерация рекомендаций на основе текущего состояния
   */
  async generateRecommendations(state: any): Promise<RecommendationResponse> {
    const { energy, focus, motivation, stress, ui_mode } = state;

    const recommendations: string[] = [];
    let workMode: WorkMode = WorkMode.NORMAL;
    let breakNeeded = false;
    let breakDuration = 0;
    const stressReliefExercises: string[] = [];

    // Определяем режим работы и рекомендации по UI Mode
    switch (ui_mode) {
      case UIMode.PEAK:
        workMode = WorkMode.DEEP_WORK;
        recommendations.push(
          ...this.uiModeService.getRecommendationsForMode(UIMode.PEAK),
        );
        recommendations.push('Рекомендуем блоки работы по 90-120 минут');
        break;

      case UIMode.NORMAL:
        workMode = WorkMode.NORMAL;
        recommendations.push(
          ...this.uiModeService.getRecommendationsForMode(UIMode.NORMAL),
        );
        recommendations.push('Используйте Pomodoro (25 мин работа / 5 мин отдых)');
        break;

      case UIMode.LOW:
        workMode = WorkMode.POMODORO;
        recommendations.push(
          ...this.uiModeService.getRecommendationsForMode(UIMode.LOW),
        );
        recommendations.push('Короткие сессии работы (15-20 минут)');
        breakNeeded = true;
        breakDuration = 10;
        break;

      case UIMode.CRITICAL:
        workMode = WorkMode.RECOVERY;
        recommendations.push(
          ...this.uiModeService.getRecommendationsForMode(UIMode.CRITICAL),
        );
        breakNeeded = true;
        breakDuration = 30;
        stressReliefExercises.push(...this.getStressReliefExercises());
        break;
    }

    // Дополнительные рекомендации по стрессу
    if (stress > 7) {
      recommendations.push('⚠️ Высокий уровень стресса обнаружен');
      recommendations.push('Рекомендуем немедленный перерыв и упражнения для снятия стресса');
      stressReliefExercises.push(...this.getStressReliefExercises());
    } else if (stress > 5) {
      recommendations.push('Уровень стресса повышен. Следите за своим состоянием.');
    }

    // Рекомендации по энергии
    if (energy < 4) {
      recommendations.push('Низкая энергия. Рекомендуем:');
      recommendations.push('• Короткую прогулку на свежем воздухе (10-15 минут)');
      recommendations.push('• Легкий перекус (орехи, фрукты)');
      recommendations.push('• Стакан воды');
    }

    // Рекомендации по фокусу
    if (focus < 40) {
      recommendations.push('Сложности с концентрацией. Попробуйте:');
      recommendations.push('• Дыхательное упражнение 4-7-8');
      recommendations.push('• Убрать все отвлекающие факторы');
      recommendations.push('• Начать с самой простой задачи');
    }

    // Рекомендации по времени суток
    const circadian = this.circadianService.getCurrentCircadianFactor();
    if (circadian.phase === 'AFTERNOON_DIP') {
      recommendations.push('Послеобеденный спад энергии — нормальное явление');
      recommendations.push('Рекомендуем легкие задачи или короткую прогулку');
    } else if (circadian.phase === 'MAXIMUM') {
      recommendations.push('Сейчас пик продуктивности! Используйте это время максимально');
    }

    return {
      recommendations,
      work_mode: workMode,
      break_needed: breakNeeded,
      break_duration: breakNeeded ? breakDuration : undefined,
      stress_relief_exercises: stressReliefExercises.length > 0 ? stressReliefExercises : undefined,
      next_test_time: this.getNextTestTime(),
    };
  }

  private getStressReliefExercises(): string[] {
    return [
      '🧘 Медитация (10 минут): сфокусируйтесь на дыхании',
      '🚶 Прогулка на свежем воздухе (15-20 минут)',
      '💆 Прогрессивная мышечная релаксация',
      '🎵 Послушайте спокойную музыку',
      '📝 Напишите список того, что вас беспокоит',
      '☕ Сделайте перерыв на чай/кофе без работы',
    ];
  }

  private getNextTestTime(): string {
    const now = new Date();
    const currentHour = now.getHours();

    // Расписание тестов: 8:00, 12:00, 15:00, 18:00
    const testHours = [8, 12, 15, 18];
    
    for (const hour of testHours) {
      if (currentHour < hour) {
        return `${String(hour).padStart(2, '0')}:00`;
      }
    }

    // Если все тесты на сегодня пройдены, возвращаем время первого теста завтра
    return 'Завтра в 08:00';
  }

  private getDefaultState(userId: string): any {
    return {
      userId,
      energy: 5,
      energy_adjusted: 5,
      focus: 50,
      focus_adjusted: 50,
      motivation: 5,
      stress: 5,
      ui_mode: UIMode.NORMAL,
      ui_mode_description: 'Нормальное состояние',
      circadian: this.circadianService.getCurrentCircadianFactor(),
      peak_hours: this.circadianService.getPeakHours(),
      is_peak_time: false,
      updated_at: new Date().toISOString(),
      test_count_today: 0,
    };
  }
}
