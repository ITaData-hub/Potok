import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThan } from 'typeorm';
import { UserState } from '../database/entities/user-state.entity';
import { Task } from '../database/entities/task.entity';
import { WorkSession } from '../database/entities/work-session.entity';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectRepository(UserState)
    private readonly userStateRepository: Repository<UserState>,
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(WorkSession)
    private readonly workSessionRepository: Repository<WorkSession>,
  ) {}

  /**
   * Получение сводной аналитики пользователя
   */
  async getUserSummary(userId: string, period: 'day' | 'week' | 'month' = 'week'): Promise<any> {
    this.logger.debug(`Getting summary for user ${userId}, period: ${period}`);

    const { startDate, endDate } = this.getDateRange(period);

    try {
      const [states, tasks, sessions] = await Promise.all([
        this.getUserStates(userId, startDate, endDate),
        this.getUserTasks(userId, startDate, endDate),
        this.getWorkSessions(userId, startDate, endDate),
      ]);

      // Средние метрики состояния
      const avgEnergy = this.calculateAverage(states.map((s) => s.energy));
      const avgFocus = this.calculateAverage(states.map((s) => s.focus));
      const avgMotivation = this.calculateAverage(states.map((s) => s.motivation));
      const avgStress = this.calculateAverage(states.map((s) => s.stress));

      // Статистика задач
      const completedTasks = tasks.filter((t) => t.status === 'completed');
      const totalTasks = tasks.length;
      const completionRate = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;

      // Рабочее время
      const totalWorkTime = sessions.reduce((sum, s) => {
        if (s.actual_end_time && s.start_time) {
          const duration = Math.floor(
            (new Date(s.actual_end_time).getTime() - new Date(s.start_time).getTime()) / 60000
          );
          return sum + duration;
        }
        return sum + (s.planned_duration || 0);
      }, 0);

      // Пиковые часы
      const peakHours = await this.getPeakHours(userId, startDate, endDate);

      return {
        period,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        
        state_metrics: {
          average_energy: Number(avgEnergy.toFixed(1)),
          average_focus: Math.round(avgFocus),
          average_motivation: Number(avgMotivation.toFixed(1)),
          average_stress: Number(avgStress.toFixed(1)),
          total_tests: states.length,
        },

        task_metrics: {
          total_tasks: totalTasks,
          tasks_completed: completedTasks.length,
          completion_rate: completionRate,
          tasks_in_progress: tasks.filter((t) => t.status === 'in_progress').length,
          tasks_pending: tasks.filter((t) => t.status === 'pending').length,
        },

        work_metrics: {
          total_work_time: totalWorkTime,
          work_sessions: sessions.length,
          average_session_duration: sessions.length > 0 
            ? Math.round(totalWorkTime / sessions.length) 
            : 0,
        },

        productivity: {
          peak_hours: peakHours,
        },
      };
    } catch (error) {
      this.logger.error(`Error getting user summary: ${error.message}`);
      throw error;
    }
  }

  /**
   * Получение паттернов продуктивности
   */
  async getUserPatterns(userId: string): Promise<any> {
    this.logger.debug(`Analyzing patterns for user ${userId}`);

    const { startDate, endDate } = this.getDateRange('month');

    try {
      const [states, tasks] = await Promise.all([
        this.getUserStates(userId, startDate, endDate),
        this.getUserTasks(userId, startDate, endDate),
      ]);

      if (states.length < 10) {
        return {
          message: 'Недостаточно данных для анализа паттернов',
          min_required: 10,
          current: states.length,
        };
      }

      // Анализ по часам
      const hourlyEnergy = await this.analyzeHourlyMetrics(userId, 'energy', startDate, endDate);
      const hourlyFocus = await this.analyzeHourlyMetrics(userId, 'focus', startDate, endDate);

      // Находим лучшее время
      const bestEnergyHour = hourlyEnergy.reduce((max, curr) => 
        curr.average > max.average ? curr : max
      , hourlyEnergy[0]);

      const bestFocusHour = hourlyFocus.reduce((max, curr) => 
        curr.average > max.average ? curr : max
      , hourlyFocus[0]);

      // ИСПРАВЛЕНИЕ: Добавляем await и правильные параметры
      const stressTriggers = await this.identifyStressTriggers(userId, startDate, endDate);

      // Самые продуктивные дни
      const productivityDays = await this.getProductivityDays(userId, startDate, endDate);

      // Рекомендации
      const recommendations = this.generatePatternRecommendations(
        hourlyEnergy,
        hourlyFocus,
        stressTriggers,
        productivityDays,
      );

      return {
        patterns: {
          best_energy_time: `${String(bestEnergyHour.hour).padStart(2, '0')}:00`,
          best_focus_time: `${String(bestFocusHour.hour).padStart(2, '0')}:00`,
          stress_triggers: stressTriggers,
          productivity_days: productivityDays,
        },
        hourly_energy: hourlyEnergy,
        hourly_focus: hourlyFocus,
        recommendations,
      };
    } catch (error) {
      this.logger.error(`Error analyzing patterns: ${error.message}`);
      throw error;
    }
  }

  /**
   * Аналитика по задачам
   */
  async getTasksAnalytics(userId: string): Promise<any> {
    this.logger.debug(`Getting tasks analytics for user ${userId}`);

    const { startDate, endDate } = this.getDateRange('month');

    try {
      const tasks = await this.getUserTasks(userId, startDate, endDate);

      const statusBreakdown = {
        completed: tasks.filter((t) => t.status === 'completed').length,
        in_progress: tasks.filter((t) => t.status === 'in_progress').length,
        pending: tasks.filter((t) => t.status === 'pending').length,
        cancelled: tasks.filter((t) => t.status === 'cancelled').length,
      };

      const priorityBreakdown = {
        high: tasks.filter((t) => t.priority === 'high').length,
        medium: tasks.filter((t) => t.priority === 'medium').length,
        low: tasks.filter((t) => t.priority === 'low').length,
      };

      const complexityBreakdown = {
        high: tasks.filter((t) => t.complexity === 'high').length,
        medium: tasks.filter((t) => t.complexity === 'medium').length,
        low: tasks.filter((t) => t.complexity === 'low').length,
      };

      // Среднее время выполнения
      const completedTasks = tasks.filter(
        (t) => t.status === 'completed' && t.completed_at && t.started_at,
      );

      let avgCompletionTime = 0;
      if (completedTasks.length > 0) {
        const totalTime = completedTasks.reduce((sum, task) => {
          const duration =
            new Date(task.completed_at).getTime() - new Date(task.started_at).getTime();
          return sum + duration / (1000 * 60 * 60); // В часах
        }, 0);
        avgCompletionTime = totalTime / completedTasks.length;
      }

      const completionRate = tasks.length > 0
        ? Math.round((statusBreakdown.completed / tasks.length) * 100)
        : 0;

      return {
        total_tasks: tasks.length,
        status_breakdown: statusBreakdown,
        priority_breakdown: priorityBreakdown,
        complexity_breakdown: complexityBreakdown,
        completion_rate: completionRate,
        average_completion_time_hours: Number(avgCompletionTime.toFixed(1)),
      };
    } catch (error) {
      this.logger.error(`Error getting tasks analytics: ${error.message}`);
      throw error;
    }
  }

  // ==================== Вспомогательные методы ====================

  /**
   * Получение диапазона дат
   */
  private getDateRange(period: 'day' | 'week' | 'month'): { startDate: Date; endDate: Date } {
    const endDate = new Date();
    const startDate = new Date();

    switch (period) {
      case 'day':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
    }

    return { startDate, endDate };
  }

  /**
   * Получение состояний пользователя
   */
  private async getUserStates(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<UserState[]> {
    return await this.userStateRepository.find({
      where: {
        user_id: userId,
        created_at: Between(startDate, endDate),
      },
      order: { created_at: 'ASC' },
    });
  }

  /**
   * Получение задач пользователя
   */
  private async getUserTasks(userId: string, startDate: Date, endDate: Date): Promise<Task[]> {
    return await this.taskRepository.find({
      where: {
        user_id: userId,
        created_at: Between(startDate, endDate),
      },
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Получение рабочих сессий
   */
  private async getWorkSessions(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<WorkSession[]> {
    return await this.workSessionRepository.find({
      where: {
        user_id: userId,
        start_time: Between(startDate, endDate),
      },
      order: { start_time: 'DESC' },
    });
  }

  /**
   * Расчет среднего значения
   */
  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    const sum = values.reduce((acc, val) => acc + val, 0);
    return sum / values.length;
  }

  /**
   * Получение пиковых часов продуктивности
   */
  private async getPeakHours(userId: string, startDate: Date, endDate: Date): Promise<string[]> {
    const states = await this.getUserStates(userId, startDate, endDate);

    if (states.length === 0) return [];

    // Группируем по часам
    const hourlyEnergy = new Map<number, number[]>();

    for (let hour = 0; hour < 24; hour++) {
      hourlyEnergy.set(hour, []);
    }

    states.forEach((state) => {
      const hour = new Date(state.created_at).getHours();
      const energyValues = hourlyEnergy.get(hour);

      // ИСПРАВЛЕНО: Проверяем что массив существует
      if (energyValues !== undefined) {
        energyValues.push(state.energy);
      }
    });

    // Вычисляем средние значения
    const hourlyAverages = new Map<number, number>();

    hourlyEnergy.forEach((values, hour) => {
      if (values.length > 0) {
        const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
        hourlyAverages.set(hour, avg);
      }
    });

    // Находим топ-3 часа
    const sortedHours = Array.from(hourlyAverages.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([hour]) => `${String(hour).padStart(2, '0')}:00-${String(hour + 1).padStart(2, '0')}:00`);

    return sortedHours;
  }

  /**
   * Анализ почасовых метрик
   */
  private async analyzeHourlyMetrics(
    userId: string,
    metric: 'energy' | 'focus' | 'motivation' | 'stress',
    startDate: Date,
    endDate: Date,
  ): Promise<{ hour: number; average: number }[]> {
    const states = await this.getUserStates(userId, startDate, endDate);

    const hourlyData = new Map<number, number[]>();

    // Инициализируем все часы
    for (let hour = 0; hour < 24; hour++) {
      hourlyData.set(hour, []);
    }

    states.forEach((state) => {
      const hour = new Date(state.created_at).getHours();
      const dataArray = hourlyData.get(hour);

      // ИСПРАВЛЕНО: Проверяем что массив существует
      if (dataArray !== undefined) {
        dataArray.push(state[metric]);
      }
    });

    // Вычисляем средние значения
    const result: { hour: number; average: number }[] = [];

    hourlyData.forEach((values, hour) => {
      if (values.length > 0) {
        const average = values.reduce((sum, val) => sum + val, 0) / values.length;
        result.push({ hour, average: Number(average.toFixed(2)) });
      }
    });

    return result.sort((a, b) => a.hour - b.hour);
  }

  /**
   * Определение самых продуктивных дней недели
   */
  private async getProductivityDays(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<string[]> {
    const tasks = await this.taskRepository.find({
      where: {
        user_id: userId,
        status: 'completed',
        completed_at: Between(startDate, endDate),
      },
    });

    if (tasks.length === 0) return [];

    const dailyProductivity = new Map<number, number[]>();

    // Инициализируем дни недели (0 = воскресенье, 6 = суббота)
    for (let day = 0; day < 7; day++) {
      dailyProductivity.set(day, []);
    }

    tasks.forEach((task) => {
      if (!task.completed_at) return;

      const dayOfWeek = new Date(task.completed_at).getDay();
      const productivity = this.calculateTaskProductivity(task);
      const productivityArray = dailyProductivity.get(dayOfWeek);

      // ИСПРАВЛЕНО: Проверяем что массив существует
      if (productivityArray !== undefined) {
        productivityArray.push(productivity);
      }
    });

    // Вычисляем средние значения
    const dayAverages = new Map<number, number>();

    dailyProductivity.forEach((values, day) => {
      if (values.length > 0) {
        const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
        dayAverages.set(day, avg);
      }
    });

    // Топ-3 дня
    const dayNames = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];

    const topDays = Array.from(dayAverages.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([day]) => dayNames[day]);

    return topDays;
  }

  /**
   * Определение триггеров стресса
   */
  private async identifyStressTriggers(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<string[]> {
    const states = await this.userStateRepository.find({
      where: {
        user_id: userId,
        created_at: Between(startDate, endDate),
      },
      order: { created_at: 'ASC' },
    });

    if (states.length < 5) return [];

    const triggers: Set<string> = new Set();
    const hourlyStress = new Map<string, { energy: number[]; focus: number[]; stress: number[] }>();

    // Инициализируем категории времени
    const timeCategories = [
      'morning',
      'late_morning',
      'after_lunch',
      'afternoon',
      'evening',
      'late_evening',
    ];

    timeCategories.forEach((category) => {
      hourlyStress.set(category, { energy: [], focus: [], stress: [] });
    });

    states.forEach((state) => {
      const hour = new Date(state.created_at).getHours();
      const category = this.getTimeCategory(hour);
      const data = hourlyStress.get(category);

      // ИСПРАВЛЕНО: Проверяем что data существует
      if (data !== undefined) {
        data.energy.push(state.energy);
        data.focus.push(state.focus);
        data.stress.push(state.stress);
      }
    });

    // Анализируем паттерны стресса
    hourlyStress.forEach((data, category) => {
      if (data.stress.length < 3) return;

      const avgStress = data.stress.reduce((sum, val) => sum + val, 0) / data.stress.length;
      const avgEnergy = data.energy.reduce((sum, val) => sum + val, 0) / data.energy.length;

      // Высокий стресс (> 6) и низкая энергия (< 5)
      if (avgStress > 6 && avgEnergy < 5) {
        triggers.add(category);
      }

      // Очень высокий стресс (> 7.5)
      if (avgStress > 7.5) {
        triggers.add(category);
      }
    });

    return Array.from(triggers);
  }

  /**
   * Генерация рекомендаций на основе паттернов
   */
  private generatePatternRecommendations(
    hourlyEnergy: { hour: number; average: number }[],
    hourlyFocus: { hour: number; average: number }[],
    stressTriggers: string[],
    productivityDays: string[],
  ): string[] {
    const recommendations: string[] = [];

    // Рекомендации по времени
    const topEnergyHours = hourlyEnergy
      .sort((a, b) => b.average - a.average)
      .slice(0, 2)
      .map((h) => h.hour);

    if (topEnergyHours.length > 0) {
      const hoursStr = topEnergyHours
        .map((h) => `${String(h).padStart(2, '0')}:00`)
        .join(' и ');
      recommendations.push(`Планируйте сложные задачи на ${hoursStr}`);
    }

    // Рекомендации по стрессу
    if (stressTriggers.includes('after_lunch')) {
      recommendations.push('После обеда делайте перерыв 10-15 минут перед работой');
    }

    if (stressTriggers.includes('late_evening')) {
      recommendations.push('Избегайте сложных задач поздним вечером');
    }

    if (stressTriggers.length > 2) {
      recommendations.push('Рассмотрите техники управления стрессом (медитация, дыхательные упражнения)');
    }

    // Рекомендации по дням
    if (productivityDays.length > 0) {
      recommendations.push(
        `Ваши самые продуктивные дни: ${productivityDays.join(', ')} — планируйте важные задачи на эти дни`,
      );
    }

    return recommendations;
  }

  /**
   * Определение категории времени по часу
   */
  private getTimeCategory(hour: number): string {
    if (hour >= 6 && hour < 9) return 'morning';
    if (hour >= 9 && hour < 12) return 'late_morning';
    if (hour >= 12 && hour < 15) return 'after_lunch';
    if (hour >= 15 && hour < 18) return 'afternoon';
    if (hour >= 18 && hour < 21) return 'evening';
    return 'late_evening';
  }

  /**
   * Расчет продуктивности задачи
   */
  private calculateTaskProductivity(task: Task): number {
    let score = 1;

    if (task.priority === 'high') score += 0.5;
    if (task.complexity === 'high') score += 0.3;

    if (task.completed_at && task.started_at) {
      const duration =
        new Date(task.completed_at).getTime() - new Date(task.started_at).getTime();
      const hours = duration / (1000 * 60 * 60);
      const estimated = (task.estimated_duration || 60) / 60;

      // Бонус за быстрое выполнение
      if (hours <= estimated) {
        score += 0.2;
      }
    }

    return score;
  }
}
