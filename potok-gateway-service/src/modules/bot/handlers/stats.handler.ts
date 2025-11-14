// src/modules/bot/handlers/stats.handler.ts
import { Injectable, Logger } from '@nestjs/common';
import { MessageSender } from '../services/message-sender.service';
import { UserManager } from '../services/user-manager.service';
import { ServiceIntegration } from '../services/service-integration.service';
import { InlineKeyboard } from '../bot.service';

@Injectable()
export class StatsHandler {
  private readonly logger = new Logger(StatsHandler.name);

  constructor(
    private readonly messageSender: MessageSender,
    private readonly userManager: UserManager,
    private readonly serviceIntegration: ServiceIntegration,
  ) {}

  async handleCallback(maxUserId: string, params: string[]): Promise<void> {
    const action = params[0];

    switch (action) {
      case 'summary':
        await this.showSummary(maxUserId, 'week');
        break;
      case 'detailed':
        await this.showDetailed(maxUserId);
        break;
      case 'patterns':
        await this.showPatterns(maxUserId);
        break;
      case 'week':
        await this.showSummary(maxUserId, 'week');
        break;
      case 'month':
        await this.showSummary(maxUserId, 'month');
        break;
      case 'current':
        await this.showCurrentState(maxUserId);
        break;
      default:
        this.logger.warn(`Unknown stats action: ${action}`);
    }
  }

  private async showSummary(maxUserId: string, period: string): Promise<void> {
    const user = await this.userManager.getUserByMaxId(maxUserId);
    if (!user) return;
  
    try {
      const stats = await this.serviceIntegration.getUserStats(user.id, period);
      
      // Добавляем логирование для отладки
      this.logger.log(stats);
      
      const periodText = period === 'week' ? 'неделю' : 'месяц';
  
      // Безопасное извлечение значений с дефолтами
      const avgEnergy = stats.state_metrics?.average_energy ?? 0;
      const avgFocus = stats.state_metrics?.average_focus ?? 0;
      const avgMotivation = stats.state_metrics?.average_motivation ?? 0;
      const avgStress = stats.state_metrics?.average_stress ?? 0;
      const totalTests = stats.state_metrics?.total_tests ?? 0;
      
      const tasksCompleted = stats.task_metrics?.tasks_completed ?? 0;
      const totalTasks = stats.task_metrics?.total_tasks ?? 0;
      const completionRate = stats.task_metrics?.completion_rate ?? 0;
      
      const totalWorkTime = stats.work_metrics?.total_work_time ?? 0;
      const workSessions = stats.work_metrics?.work_sessions ?? 0;
      
      const peakHours = stats.productivity?.peak_hours ?? [];
  
      const text = `
  📊 **Статистика за ${periodText}**
  
  **Задачи:**
  ✅ Завершено: ${tasksCompleted}
  📋 Всего: ${totalTasks}
  📈 Процент выполнения: ${completionRate}%
  
  **Среднее состояние:**
  ⚡ Энергия: ${avgEnergy}/10
  🎯 Фокус: ${avgFocus}%
  💪 Мотивация: ${avgMotivation}/10
  😰 Стресс: ${avgStress}/10
  
  **Активность:**
  🧪 Пройдено тестов: ${totalTests}
  ⏱️ Время работы: ${Math.floor(totalWorkTime / 60)} ч ${totalWorkTime % 60} мин
  ⭐ Рабочих сессий: ${workSessions}
  
  **Ваши пиковые часы:**
  ${peakHours.length > 0 ? peakHours.join(', ') : 'Недостаточно данных'}
  `;
  
      const keyboard: InlineKeyboard = {
        type: 'inline_keyboard',
        payload: {
          buttons: [
            [
              {
                type: 'callback',
                text: period === 'week' ? '📅 За месяц' : '📅 За неделю',
                payload: period === 'week' ? 'stats:month' : 'stats:week',
              },
              { type: 'callback', text: '🔍 Паттерны', payload: 'stats:patterns' },
            ],
            [
              { type: 'callback', text: '📊 Задачи', payload: 'stats:tasks' },
              { type: 'callback', text: '↩️ Главное меню', payload: 'menu:main' },
            ],
          ],
        },
      };
  
      await this.messageSender.showScreen(maxUserId, text, keyboard);
    } catch (error) {
      this.logger.error(`Error showing summary: ${error.message}`);
      await this.messageSender.showScreen(
        maxUserId,
        '❌ Ошибка при получении статистики.',
      );
    }
  }

  private async showDetailed(maxUserId: string): Promise<void> {
    const user = await this.userManager.getUserByMaxId(maxUserId);
    if (!user) return;

    try {
      const tasksAnalytics = await this.serviceIntegration.getTasksAnalytics(user.id);

      const text = `
📊 **Подробная аналитика задач**

**Общая статистика:**
📋 Всего задач: ${tasksAnalytics.total_tasks}
✅ Завершено: ${tasksAnalytics.status_breakdown.completed}
⏳ В работе: ${tasksAnalytics.status_breakdown.in_progress}
📝 В ожидании: ${tasksAnalytics.status_breakdown.pending}
❌ Отменено: ${tasksAnalytics.status_breakdown.cancelled}

**По приоритетам:**
🔴 Высокий: ${tasksAnalytics.priority_breakdown.high}
🟡 Средний: ${tasksAnalytics.priority_breakdown.medium}
🟢 Низкий: ${tasksAnalytics.priority_breakdown.low}

**Эффективность:**
📈 Процент завершения: ${tasksAnalytics.completion_rate}%
⏱️ Среднее время выполнения: ${tasksAnalytics.average_completion_time_hours.toFixed(1)} часов
`;

      const keyboard: InlineKeyboard = {
        type: 'inline_keyboard',
        payload: {
          buttons: [
            [
              { type: 'callback', text: '🔍 Паттерны', payload: 'stats:patterns' },
              { type: 'callback', text: '📊 Общая статистика', payload: 'stats:summary' },
            ],
            [{ type: 'callback', text: '↩️ Главное меню', payload: 'menu:main' }],
          ],
        },
      };

      await this.messageSender.showScreen(maxUserId, text, keyboard);
    } catch (error) {
      this.logger.error(`Error showing detailed stats: ${error.message}`);
      await this.messageSender.showScreen(
        maxUserId,
        '❌ Ошибка при получении детальной статистики.',
      );
    }
  }

  private async showPatterns(maxUserId: string): Promise<void> {
    const user = await this.userManager.getUserByMaxId(maxUserId);
    if (!user) return;

    try {
      const patterns = await this.serviceIntegration.getUserPatterns(user.id);

      if (!patterns || !patterns.patterns) {
        const keyboard: InlineKeyboard = {
          type: 'inline_keyboard',
          payload: {
            buttons: [
              [
                { type: 'callback', text: '🧪 Пройти тест', payload: 'test:menu' },
                { type: 'callback', text: '➕ Добавить задачу', payload: 'task:add' },
              ],
              [{ type: 'callback', text: '↩️ Главное меню', payload: 'menu:main' }],
            ],
          },
        };

        await this.messageSender.showScreen(
          maxUserId,
          '📊 Недостаточно данных для анализа паттернов.\n\n' +
          'Пройдите больше тестов и выполните задачи для получения персональной аналитики.',
          keyboard,
        );
        return;
      }

      const text = `
🔍 **Паттерны продуктивности**

**Лучшее время для работы:**
⚡ Максимальная энергия: ${patterns.best_energy_time}
🎯 Максимальный фокус: ${patterns.best_focus_time}

**Триггеры стресса:**
${patterns.stress_triggers.length > 0
  ? patterns.stress_triggers.map(t => this.getStressTriggerText(t)).join('\n')
  : '✅ Триггеров не обнаружено'}

**Самые продуктивные дни:**
${patterns.productivity_days.join(', ')}

**Рекомендации:**
${patterns.recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}
`;

      const keyboard: InlineKeyboard = {
        type: 'inline_keyboard',
        payload: {
          buttons: [
            [
              { type: 'callback', text: '📊 Общая статистика', payload: 'stats:summary' },
              { type: 'callback', text: '📈 Задачи', payload: 'stats:tasks' },
            ],
            [{ type: 'callback', text: '↩️ Главное меню', payload: 'menu:main' }],
          ],
        },
      };

      await this.messageSender.showScreen(maxUserId, text, keyboard);
    } catch (error) {
      this.logger.error(`Error showing patterns: ${error.message}`);
      await this.messageSender.showScreen(
        maxUserId,
        '❌ Ошибка при получении паттернов.',
      );
    }
  }

  private getStressTriggerText(trigger: string): string {
    const map = {
      after_lunch: '• 🍽️ После обеда',
      late_evening: '• 🌙 Поздний вечер',
      morning: '• 🌅 Утро',
    };
    return map[trigger] || `• ${trigger}`;
  }

  /**
 * 📊 Показать текущее состояние пользователя
 */
private async showCurrentState(maxUserId: string): Promise<void> {
  try {
    const user = await this.userManager.getUserByMaxId(maxUserId);
    if (!user) {
      await this.messageSender.showScreen(
        maxUserId,
        '❌ Не удалось получить информацию о вашем состоянии.'
      );
      return;
    }

    // Получаем текущее состояние из State Management
    const state = await this.serviceIntegration.getCurrentState(user.id);

    if (!state) {
      await this.messageSender.showScreen(
        maxUserId,
        '⚠️ У вас пока нет данных о состоянии.\n\nПройдите первый тест, чтобы система начала отслеживать ваше состояние.',
        {
          type: 'inline_keyboard',
          payload: {
            buttons: [
              [{ type: 'callback', text: '🧪 Пройти тест', payload: 'test:menu' }],
              [{ type: 'callback', text: '↩️ Назад', payload: 'menu:main' }],
            ],
          },
        }
      );
      return;
    }

    // Формируем визуализацию состояния
    const energyBar = this.createProgressBar(state.energy, 10);
    const focusBar = this.createProgressBar(state.focus, 100);
    const motivationBar = this.createProgressBar(state.motivation, 10);
    const stressBar = this.createProgressBar(state.stress, 10);

    // Определяем эмодзи для UI режима
    const uiModeEmoji = {
      PEAK: '🚀',
      NORMAL: '✅',
      LOW: '⚠️',
      CRITICAL: '🚨',
    }[state.ui_mode] || '📊';

    // Интерпретация показателей
    const energyText = this.interpretValue(state.energy, [
      'Очень низкая',
      'Низкая',
      'Средняя',
      'Хорошая',
      'Отличная',
    ]);
    const focusText = this.interpretValue(state.focus / 10, [
      'Очень низкий',
      'Низкий',
      'Средний',
      'Хороший',
      'Отличный',
    ]);
    const motivationText = this.interpretValue(state.motivation, [
      'Очень низкая',
      'Низкая',
      'Средняя',
      'Хорошая',
      'Отличная',
    ]);
    const stressText = this.interpretValue(state.stress, [
      'Минимальный',
      'Низкий',
      'Умеренный',
      'Высокий',
      'Критический',
    ]);

    const text = `
📊 **Моё текущее состояние**

${uiModeEmoji} **Режим:** ${this.translateUIMode(state.ui_mode)}

**Показатели:**

⚡ **Энергия:** ${state.energy}/10 - ${energyText}
${energyBar}

🎯 **Фокус:** ${state.focus}/100 - ${focusText}
${focusBar}

💪 **Мотивация:** ${state.motivation}/10 - ${motivationText}
${motivationBar}

😰 **Стресс:** ${state.stress}/10 - ${stressText}
${stressBar}

**Рекомендации:**
${this.getRecommendations(state)}

**Последнее обновление:**
${this.formatDate(state.updated_at || new Date().toISOString())}

**Тесты сегодня:** ${state.test_count_today || 0}/4
`;

    const keyboard = {
      type: 'inline_keyboard' as const,
      payload: {
        buttons: [
          [{ type: 'callback' as const, text: '🧪 Пройти тест', payload: 'test:menu' }],
          [{ type: 'callback' as const, text: '📈 Статистика', payload: 'stats:summary' }],
          [{ type: 'callback' as const, text: '↩️ Назад', payload: 'menu:main' }],
        ],
      },
    };

    await this.messageSender.showScreen(maxUserId, text, keyboard);
  } catch (error) {
    this.logger.error(`Error showing current state: ${error.message}`);
    await this.messageSender.showScreen(
      maxUserId,
      '❌ Произошла ошибка при получении состояния. Попробуйте позже.'
    );
  }
}

/**
 * Создать прогресс-бар
 */
private createProgressBar(value: number, max: number): string {
  const percentage = Math.min(100, Math.floor((value / max) * 100));
  const filled = Math.floor(percentage / 10);
  const empty = 10 - filled;
  
  return '█'.repeat(filled) + '░'.repeat(empty) + ` ${percentage}%`;
}

/**
 * Интерпретировать значение
 */
private interpretValue(value: number, labels: string[]): string {
  if (value <= 2) return labels[0];
  if (value <= 4) return labels[1];
  if (value <= 6) return labels[2];
  if (value <= 8) return labels[3];
  return labels[4];
}

/**
 * Получить рекомендации по состоянию
 */
private getRecommendations(state: any): string {
  const recommendations: string[] = [];

  if (state.ui_mode === 'CRITICAL') {
    recommendations.push('🚨 Немедленно прекратите работу и отдохните!');
    recommendations.push('🧘 Используйте дыхательные упражнения');
  } else if (state.ui_mode === 'LOW') {
    recommendations.push('⚠️ Работайте над простыми задачами');
    recommendations.push('☕ Делайте частые перерывы');
  } else if (state.ui_mode === 'PEAK') {
    recommendations.push('🚀 Отличное время для сложных задач!');
    recommendations.push('🎯 Сфокусируйтесь на своей MIT');
  } else {
    recommendations.push('✅ Продолжайте в том же темпе');
    recommendations.push('🍅 Используйте технику Pomodoro');
  }

  if (state.stress > 7) {
    recommendations.push('😰 Высокий стресс - сделайте перерыв');
  }

  if (state.energy < 4) {
    recommendations.push('⚡ Низкая энергия - прогулка или лёгкий перекус помогут');
  }

  return recommendations.map(r => `• ${r}`).join('\n');
}

/**
 * Перевести UI Mode
 */
private translateUIMode(mode: string): string {
  const translations = {
    PEAK: 'Пик продуктивности',
    NORMAL: 'Нормальное состояние',
    LOW: 'Сниженная продуктивность',
    CRITICAL: 'Критическое состояние',
  };
  return translations[mode] || mode;
}

/**
 * Форматировать дату
 */
private formatDate(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) return 'только что';
  if (minutes < 60) return `${minutes} мин назад`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ч назад`;
  
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
}
}
