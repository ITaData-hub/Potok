import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { AdminClientService } from '../admin-client/admin-client.service';
import { TestCalculatorService } from '../tests/services/test-calculator.service';
import { CircadianService } from './services/circadian.service';
import { UiModeService } from './services/ui-mode.service';
import { UIMode } from '../../common/enums/ui-mode.enum';
import { UserState } from '@common/interfaces/user-state.interface';

@Injectable()
export class StateService {
  private readonly logger = new Logger(StateService.name);

  constructor(
    private readonly adminClient: AdminClientService,
    private readonly circadianService: CircadianService,
    private readonly uiModeService: UiModeService,
  ) {}

  /**
   * Получить текущее состояние пользователя с UI Mode
   */
  async getCurrentState(userId: string): Promise<any> {
    try {
      // Получаем последние данные состояния из БД
      const stateData = await this.adminClient.dbList('user-states', {
        user_id: userId,
        order_by: 'created_at',
        order: 'DESC',
        limit: 1,
      });

      if (!stateData || stateData.length === 0) {
        return this.getDefaultState(userId);
      }

      const latestState = stateData[0];

      // Определяем UI Mode
      const uiMode = this.uiModeService.determineUIMode({
        energy: latestState.energy,
        focus: latestState.focus,
        motivation: latestState.motivation,
        stress: latestState.stress,
      });

      // Получаем циркадные данные
      const circadian = this.circadianService.getCurrentCircadianFactor();

      // Корректируем energy и focus с учетом циркадного ритма
      const adjustedEnergy = this.circadianService.adjustScoreByCircadian(
        latestState.energy,
      );
      const adjustedFocus = this.circadianService.adjustScoreByCircadian(
        latestState.focus / 10, // Конвертируем 0-100 в 0-10
      ) * 10;

      return {
        userId,
        energy: latestState.energy,
        energy_adjusted: adjustedEnergy,
        focus: latestState.focus,
        focus_adjusted: Math.round(adjustedFocus),
        motivation: latestState.motivation,
        stress: latestState.stress,
        ui_mode: uiMode,
        ui_mode_description: this.uiModeService.getUIModeDescription(uiMode),
        circadian: {
          phase: circadian.phase,
          factor: circadian.factor,
          description: circadian.description,
        },
        peak_hours: this.circadianService.getPeakHours(),
        is_peak_time: this.circadianService.isPeakTime(),
        updated_at: latestState.created_at,
        test_count_today: latestState.test_count_today || 0,
      };
    } catch (error) {
      this.logger.error(`Error getting current state: ${error.message}`);
      throw error;
    }
  }

  /**
   * Прогноз состояния на день
   */
  async getForecast(userId: string): Promise<any> {
    try {
      const currentState = await this.getCurrentState(userId);
      const circadianForecast = this.circadianService.getForecastForDay();

      // Прогнозируем энергию и фокус на каждый час с учетом циркадного ритма
      const forecast = circadianForecast.map((item) => {
        const forecastEnergy = Math.min(
          10,
          Math.max(0, currentState.energy * item.factor),
        );
        const forecastFocus = Math.min(
          100,
          Math.max(0, currentState.focus * item.factor),
        );

        return {
          hour: item.hour,
          time: `${String(item.hour).padStart(2, '0')}:00`,
          energy: Number(forecastEnergy.toFixed(1)),
          focus: Math.round(forecastFocus),
          phase: item.phase,
          circadian_factor: item.factor,
        };
      });

      return {
        userId,
        date: new Date().toISOString().split('T')[0],
        current_state: {
          energy: currentState.energy,
          focus: currentState.focus,
          motivation: currentState.motivation,
          stress: currentState.stress,
        },
        forecast,
        peak_periods: this.identifyPeakPeriods(forecast),
        recommendations: this.generateForecastRecommendations(forecast),
      };
    } catch (error) {
      this.logger.error(`Error generating forecast: ${error.message}`);
      throw error;
    }
  }

  /**
   * Получить тренды состояния
   */
  async getTrends(userId: string, days: number = 7): Promise<any> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Получаем все состояния за период
      const states = await this.adminClient.dbList('user-states', {
        user_id: userId,
        created_at_gte: startDate.toISOString(),
        created_at_lte: endDate.toISOString(),
        order_by: 'created_at',
        order: 'ASC',
      });

      if (!states || states.length === 0) {
        return {
          userId,
          period: `${days} days`,
          trends: [],
          averages: null,
          message: 'Недостаточно данных для анализа трендов',
        };
      }

      // Группируем по дням
      const dailyData = this.groupByDay(states);

      // Вычисляем средние значения
      const averages = this.calculateAverages(states);

      // Определяем тренды
      const trends = this.analyzeTrends(dailyData);

      return {
        userId,
        period: `${days} days`,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        data_points: states.length,
        averages,
        trends,
        daily_data: dailyData,
      };
    } catch (error) {
      this.logger.error(`Error calculating trends: ${error.message}`);
      throw error;
    }
  }

  // ==================== Вспомогательные методы ====================

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

  private identifyPeakPeriods(forecast: any[]): string[] {
    const peaks = forecast
      .filter((item) => item.energy >= 7 && item.focus >= 70)
      .map((item) => item.time);

    return peaks.length > 0 ? peaks : ['08:00', '09:00', '10:00'];
  }

  private generateForecastRecommendations(forecast: any[]): string[] {
    const peakPeriods = this.identifyPeakPeriods(forecast);
    const recommendations = [];

    if (peakPeriods.length > 0) {
      recommendations.push(
        `Ваши пиковые часы: ${peakPeriods.slice(0, 3).join(', ')}. Планируйте сложные задачи на это время.`,
      );
    }

    const lowPeriods = forecast.filter((item) => item.energy < 5);
    if (lowPeriods.length > 0) {
      const lowTimes = lowPeriods.slice(0, 2).map((item) => item.time);
      recommendations.push(
        `Низкая энергия ожидается в ${lowTimes.join(', ')}. Запланируйте перерывы или легкие задачи.`,
      );
    }

    return recommendations;
  }

  private groupByDay(states: any[]): any[] {
    const grouped: Map<string, any[]> = new Map();

    states.forEach((state) => {
      const date = state.created_at.split('T')[0];
      if (!grouped.has(date)) {
        grouped.set(date, []);
      }
      grouped.get(date)!.push(state);
    });

    return Array.from(grouped.entries()).map(([date, dayStates]) => ({
      date,
      count: dayStates.length,
      avg_energy: this.average(dayStates.map((s) => s.energy)),
      avg_focus: this.average(dayStates.map((s) => s.focus)),
      avg_motivation: this.average(dayStates.map((s) => s.motivation)),
      avg_stress: this.average(dayStates.map((s) => s.stress)),
    }));
  }

  private calculateAverages(states: any[]): any {
    return {
      energy: this.average(states.map((s) => s.energy)),
      focus: this.average(states.map((s) => s.focus)),
      motivation: this.average(states.map((s) => s.motivation)),
      stress: this.average(states.map((s) => s.stress)),
    };
  }

  private analyzeTrends(dailyData: any[]): any {
    if (dailyData.length < 2) {
      return {
        energy: 'stable',
        focus: 'stable',
        motivation: 'stable',
        stress: 'stable',
      };
    }

    const first = dailyData[0];
    const last = dailyData[dailyData.length - 1];

    return {
      energy: this.getTrendDirection(first.avg_energy, last.avg_energy),
      focus: this.getTrendDirection(first.avg_focus, last.avg_focus),
      motivation: this.getTrendDirection(first.avg_motivation, last.avg_motivation),
      stress: this.getTrendDirection(first.avg_stress, last.avg_stress),
    };
  }

  private getTrendDirection(start: number, end: number): string {
    const diff = end - start;
    const threshold = 0.5; // 5% изменение

    if (diff > threshold) return 'increasing';
    if (diff < -threshold) return 'decreasing';
    return 'stable';
  }

  private average(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    const sum = numbers.reduce((acc, val) => acc + val, 0);
    return Number((sum / numbers.length).toFixed(1));
  }


  /**
 * Переход в новое состояние
 */
async transitionState(
  entityType: string,
  entityId: string,
  newStateData: any,
): Promise<UserState> {
  const userId = entityId; // entityId это userId
  
  // Создаем новое состояние
  const stateData = {
    userId,
    energy: newStateData.energy,
    focus: newStateData.focus,
    motivation: newStateData.motivation,
    stress: newStateData.stress,
    testType: newStateData.testType || 'manual',
    testAnswers: newStateData.testAnswers,
    timestamp: new Date(),
  };
  
  // Сохраняем через Admin Client
  const savedState = await this.adminClient.saveUserState(userId, stateData);
  
  this.logger.log(`State transition for user ${userId}: energy=${stateData.energy}, focus=${stateData.focus}`);
  
  return savedState;
}

/**
 * Получить историю состояний
 */
async getStateHistory(
  entityType: string,
  entityId: string,
  limit: number = 100,
): Promise<UserState[]> {
  const userId = entityId;
  
  try {
    const states = await this.adminClient.getUserStates(userId);
    
    // Сортируем по времени (новые первые)
    const sorted = states.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    
    // Ограничиваем количество
    return sorted.slice(0, limit);
  } catch (error) {
    this.logger.error(`Failed to get state history for user ${userId}:`, error);
    return [];
  }
}

/**
 * Получить список доступных состояний
 */
async getAvailableStates(entityType: string): Promise<string[]> {
  // Возвращаем типы тестов которые можно пройти
  return ['energy', 'focus', 'motivation', 'stress'];
}
}
