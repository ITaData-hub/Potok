import { Injectable, Logger } from '@nestjs/common';
import { MessageSender } from '../services/message-sender.service';
import { UserManager } from '../services/user-manager.service';
import { ServiceIntegration } from '../services/service-integration.service';
import { InlineKeyboard } from '../bot.service';

@Injectable()
export class CommandHandler {
  private readonly logger = new Logger(CommandHandler.name);

  constructor(
    private readonly messageSender: MessageSender,
    private readonly userManager: UserManager,
    private readonly serviceIntegration: ServiceIntegration,
  ) {}

  async handleCommand(maxUserId: string, command: string): Promise<void> {
    const cmd = command.split(' ')[0].toLowerCase();
    const args = command.split(' ').slice(1);

    this.logger.debug(`Handling command ${cmd} for user ${maxUserId}`);

    try {
      switch (cmd) {
        case '/start':
          await this.handleStartCommand(maxUserId);
          break;
        case '/tasks':
          await this.handleTasksCommand(maxUserId);
          break;
        case '/add':
          await this.handleAddCommand(maxUserId);
          break;
        case '/test':
          await this.handleTestCommand(maxUserId);
          break;
        case '/mit':
          await this.handleMitCommand(maxUserId);
          break;
        case '/stats':
          await this.handleStatsCommand(maxUserId);
          break;
        case '/help':
          await this.handleHelpCommand(maxUserId);
          break;
        case '/settings':
          await this.handleSettingsCommand(maxUserId);
          break;
        case '/state':
          await this.handleStateCommand(maxUserId);
          break;
        case '/cancel':
          await this.handleCancelCommand(maxUserId);
          break;
        default:
          await this.messageSender.showScreen(
            maxUserId,
            '❓ **Неизвестная команда**\n\nИспользуйте `/help` для списка команд.',
          );
      }
    } catch (error) {
      this.logger.error(`Error handling command ${cmd}: ${error.message}`);
      await this.messageSender.showScreen(
        maxUserId,
        '❌ Произошла ошибка при выполнении команды. Попробуйте еще раз.',
      );
    }
  }

  private async handleStartCommand(maxUserId: string): Promise<void> {
    const user = await this.userManager.getUserByMaxId(maxUserId);

    if (user && user.onboarding_completed) {
      await this.sendMainMenu(maxUserId);
    } else {
      await this.startOnboarding(maxUserId);
    }
  }

  private async startOnboarding(maxUserId: string): Promise<void> {
    const welcomeText = `
👋 **Добро пожаловать в Поток** — ваш личный помощник по продуктивности!

Я помогу вам:
✅ Управлять задачами с учетом вашего состояния
🧠 Отслеживать энергию, фокус и мотивацию
🎯 Находить самую важную задачу (MIT) каждый день
📊 Анализировать паттерны продуктивности

Готовы начать? 🚀
    `;

    const keyboard: InlineKeyboard = {
      type: 'inline_keyboard',
      payload: {
        buttons: [
          [
            { 
              type: 'callback', 
              text: '▶️ Начать настройку', 
              payload: 'onboarding:start' 
            }
          ],
        ],
      },
    };

    await this.messageSender.showScreen(maxUserId, welcomeText, keyboard);
  }

  private async handleTasksCommand(maxUserId: string): Promise<void> {
    const user = await this.userManager.getUserByMaxId(maxUserId);
    if (!user) {
      await this.messageSender.showScreen(
        maxUserId,
        '❌ **Пользователь не найден**\n\nИспользуйте `/start`',
      );
      return;
    }

    const tasks = await this.serviceIntegration.getUserTasks(user.id);

    if (!tasks || tasks.length === 0) {
      await this.messageSender.showScreen(
        maxUserId,
        '📭 **У вас пока нет задач**\n\nИспользуйте `/add` для добавления новой задачи.',
      );
      return;
    }

    let message = '📋 **Ваши задачи на сегодня:**\n\n';

    const displayTasks = tasks.slice(0, 10);
    displayTasks.forEach((taskItem, index) => {
      const task = taskItem.task || taskItem;
      const emoji = this.getTaskEmoji(task.priority);
      const status = this.getStatusEmoji(task.status);

      message += `${index + 1}. ${emoji} ${status} ${task.title}\n`;

      if (taskItem.recommendation) {
        message += `   💡 ${taskItem.recommendation}\n`;
      }

      if (taskItem.state_match_score) {
        const matchPercent = Math.round(taskItem.state_match_score * 100);
        message += `   📊 Соответствие: ${matchPercent}%\n`;
      }

      message += '\n';
    });

    if (tasks.length > 10) {
      message += `\n_... и еще ${tasks.length - 10} задач_\n`;
    }

    const keyboard: InlineKeyboard = {
      type: 'inline_keyboard',
      payload: {
        buttons: [
          [
            { type: 'callback', text: '➕ Добавить задачу', payload: 'task:add' },
            { type: 'callback', text: '🎯 MIT', payload: 'mit:show' },
          ],
          [
            { type: 'callback', text: '🔄 Пересортировать', payload: 'task:reprioritize' },
            { type: 'callback', text: '⏸️ Отложить задачи', payload: 'task:reschedule' },
          ],
          [
            { type: 'callback', text: '↩️ Главное меню', payload: 'menu:main' }
          ],
        ],
      },
    };

    await this.messageSender.showScreen(maxUserId, message, keyboard);
  }

  private async handleAddCommand(maxUserId: string): Promise<void> {
    const text = `
➕ **Добавление новой задачи**

Отправьте название задачи. Например:
\`Подготовить презентацию для клиента\`

После этого я задам дополнительные вопросы о приоритете и дедлайне.
    `;

    const keyboard: InlineKeyboard = {
      type: 'inline_keyboard',
      payload: {
        buttons: [
          [
            { type: 'callback', text: '↩️ Отмена', payload: 'menu:main' }
          ]
        ],
      },
    };

    await this.messageSender.showScreen(maxUserId, text, keyboard);
    await this.userManager.setUserState(maxUserId, 'awaiting_task_input');
  }

  private async handleTestCommand(maxUserId: string): Promise<void> {
    const user = await this.userManager.getUserByMaxId(maxUserId);
    if (!user) {
      await this.messageSender.showScreen(
        maxUserId,
        '❌ **Пользователь не найден**\n\nИспользуйте `/start`',
      );
      return;
    }

    const nextTest = await this.serviceIntegration.getNextAvailableTest(user.id);

    if (!nextTest) {
      await this.messageSender.showScreen(
        maxUserId,
        '✅ **Вы уже прошли все тесты на сегодня!**\n\nСледующий тест будет доступен завтра.',
      );
      return;
    }

    const testInfo = this.getTestInfo(nextTest.type);
    const availableText = nextTest.available_now
      ? '✅ Тест доступен прямо сейчас'
      : `⏰ Тест будет доступен в ${nextTest.scheduled_time}`;

    const text = `
${testInfo.emoji} **Тест "${testInfo.name}"**

${testInfo.description}

⏱️ Время: ~2 минуты
📊 Вопросов: 3
${availableText}

Готовы начать?
    `;

    const keyboard: InlineKeyboard = {
      type: 'inline_keyboard',
      payload: {
        buttons: [
          [
            { type: 'callback', text: '▶️ Начать тест', payload: `test:start:${nextTest.type}` }
          ],
          [
            { type: 'callback', text: '↩️ Отмена', payload: 'menu:main' }
          ],
        ],
      },
    };

    await this.messageSender.showScreen(maxUserId, text, keyboard);
  }

  private async handleMitCommand(maxUserId: string): Promise<void> {
    const user = await this.userManager.getUserByMaxId(maxUserId);
    if (!user) {
      await this.messageSender.showScreen(
        maxUserId,
        '❌ **Пользователь не найден**\n\nИспользуйте `/start`',
      );
      return;
    }

    const mit = await this.serviceIntegration.calculateMIT(user.id);

    if (!mit) {
      await this.messageSender.showScreen(
        maxUserId,
        '🤷‍♂️ **Не удалось определить MIT**\n\nДобавьте задачи через `/add` и пройдите тесты состояния через `/test`',
      );
      return;
    }

    const text = `
🎯 **Ваша самая важная задача (MIT):**

**${mit.title}**

${mit.description || ''}

💡 **Почему именно эта задача?**
${mit.reason}

⏰ **Рекомендуемое время:** ${mit.recommended_time}
⏱️ **Примерная длительность:** ${mit.estimated_duration} минут
📊 **Приоритет:** ${mit.priority_score.toFixed(2)}

${this.getMotivationalMessage()}
    `;

    const keyboard: InlineKeyboard = {
      type: 'inline_keyboard',
      payload: {
        buttons: [
          [
            { type: 'callback', text: '✅ Начать выполнение', payload: `task:start:${mit.taskId}` },
            { type: 'callback', text: '📋 Все задачи', payload: 'task:list' },
          ],
          [
            { type: 'callback', text: '↩️ Главное меню', payload: 'menu:main' }
          ],
        ],
      },
    };

    await this.messageSender.showScreen(maxUserId, text, keyboard);
  }

  private async handleStatsCommand(maxUserId: string): Promise<void> {
    const user = await this.userManager.getUserByMaxId(maxUserId);
    if (!user) {
      await this.messageSender.showScreen(
        maxUserId,
        '❌ **Пользователь не найден**\n\nИспользуйте `/start`',
      );
      return;
    }

    const stats = await this.serviceIntegration.getUserStats(user.id, 'week');

    const text = `
📊 **Ваша статистика за неделю**

**Задачи:**
✅ Завершено: ${stats.tasks_completed}
📋 Всего: ${stats.total_tasks}
📈 Процент выполнения: ${stats.completion_rate}%

**Состояние:**
⚡ Средняя энергия: ${stats.average_energy}/10
🎯 Средний фокус: ${stats.average_focus}%
💪 Средняя мотивация: ${stats.average_motivation}/10
😰 Средний стресс: ${stats.average_stress}/10

**Активность:**
🧪 Пройдено тестов: ${stats.total_tests}
⏱️ Время работы: ${Math.floor(stats.total_work_time / 60)} ч ${stats.total_work_time % 60} мин
⭐ Рабочих сессий: ${stats.work_sessions}

**Пиковые часы продуктивности:**
${stats.peak_hours.join(', ')}
    `;

    const keyboard: InlineKeyboard = {
      type: 'inline_keyboard',
      payload: {
        buttons: [
          [
            { type: 'callback', text: '📈 Подробная аналитика', payload: 'stats:detailed' },
            { type: 'callback', text: '🔍 Паттерны', payload: 'stats:patterns' },
          ],
          [
            { type: 'callback', text: '↩️ Главное меню', payload: 'menu:main' }
          ],
        ],
      },
    };

    await this.messageSender.showScreen(maxUserId, text, keyboard);
  }

  private async handleHelpCommand(maxUserId: string): Promise<void> {
    const text = `
❓ **Справка по командам**

**Основные команды:**
\`/start\` — Начать работу с ботом
\`/tasks\` — Список ваших задач
\`/add\` — Добавить новую задачу
\`/test\` — Пройти тест состояния
\`/mit\` — Показать самую важную задачу
\`/stats\` — Статистика и аналитика
\`/state\` — Текущее состояние
\`/settings\` — Настройки уведомлений
\`/cancel\` — Отменить текущее действие

**О тестах:**
Проходите 4 теста в день для точной оценки состояния:
• ⚡ Энергия (08:00)
• 🎯 Фокус (12:00)
• 💪 Мотивация (15:00)
• 😰 Стресс (18:00)

**Советы:**
• Фокусируйтесь на MIT в часы пиковой энергии
• Регулярно проверяйте статистику
• Следуйте рекомендациям бота
    `;

    const keyboard: InlineKeyboard = {
      type: 'inline_keyboard',
      payload: {
        buttons: [
          [
            { type: 'callback', text: '↩️ Главное меню', payload: 'menu:main' }
          ]
        ],
      },
    };

    await this.messageSender.showScreen(maxUserId, text, keyboard);
  }

  private async handleSettingsCommand(maxUserId: string): Promise<void> {
    const user = await this.userManager.getUserByMaxId(maxUserId);
    if (!user) {
      await this.messageSender.showScreen(
        maxUserId,
        '❌ **Пользователь не найден**\n\nИспользуйте `/start`',
      );
      return;
    }

    const settings = await this.userManager.getUserSettings(user.id);

    const text = `
⚙️ **Настройки**

🔔 **Уведомления:**
${settings.notifications_enabled ? '✅' : '❌'} Уведомления ${settings.notifications_enabled ? 'включены' : 'отключены'}

🧪 **Тесты:**
${settings.test_reminders ? '✅' : '❌'} Напоминания о тестах

📅 **Режим работы:**
🌅 Начало: ${settings.work_start_time || '09:00'}
🌆 Конец: ${settings.work_end_time || '18:00'}
    `;

    const keyboard: InlineKeyboard = {
      type: 'inline_keyboard',
      payload: {
        buttons: [
          [
            {
              type: 'callback',
              text: settings.notifications_enabled ? '🔕 Отключить уведомления' : '🔔 Включить уведомления',
              payload: 'settings:toggle_notifications',
            },
          ],
          [
            {
              type: 'callback',
              text: settings.test_reminders ? '❌ Отключить напоминания' : '✅ Включить напоминания',
              payload: 'settings:toggle_reminders',
            },
          ],
          [
            { type: 'callback', text: '⏰ Изменить часы работы', payload: 'settings:work_hours' },
          ],
          [
            { type: 'callback', text: '↩️ Главное меню', payload: 'menu:main' }
          ],
        ],
      },
    };

    await this.messageSender.showScreen(maxUserId, text, keyboard);
  }

  private async sendMainMenu(maxUserId: string): Promise<void> {
    const text = `
🏠 **Главное меню**

Выберите действие:
    `;

    const keyboard: InlineKeyboard = {
      type: 'inline_keyboard',
      payload: {
        buttons: [
          [
            { type: 'callback', text: '📋 Мои задачи', payload: 'task:list' },
            { type: 'callback', text: '🎯 MIT', payload: 'mit:show' },
          ],
          [
            { type: 'callback', text: '🧪 Пройти тест', payload: 'test:menu' },
            { type: 'callback', text: '📊 Статистика', payload: 'stats:summary' },
          ],
          [
            { type: 'callback', text: '➕ Добавить задачу', payload: 'task:add' },
            { type: 'callback', text: '🔍 Мое состояние', payload: 'state:current' },
          ],
          [
            { type: 'callback', text: '⚙️ Настройки', payload: 'settings:menu' },
            { type: 'callback', text: '❓ Помощь', payload: 'help:show' },
          ],
        ],
      },
    };

    await this.messageSender.showScreen(maxUserId, text, keyboard);
  }

  private async handleStateCommand(maxUserId: string): Promise<void> {
    const user = await this.userManager.getUserByMaxId(maxUserId);
    if (!user) {
      await this.messageSender.showScreen(
        maxUserId,
        '❌ **Пользователь не найден**\n\nИспользуйте `/start`',
      );
      return;
    }

    try {
      const state = await this.serviceIntegration.getCurrentState(user.id);
      const recommendations = await this.serviceIntegration.getRecommendations(user.id);

      const uiModeEmoji = this.getUIModeEmoji(state.ui_mode);
      const circadianEmoji = this.getCircadianEmoji(state.circadian.phase);

      const text = `
${uiModeEmoji} **Ваше текущее состояние**

**Метрики:**
⚡ Энергия: ${state.energy}/10 ${state.energy !== state.energy_adjusted ? `(${state.energy_adjusted} с циркадным ритмом)` : ''}
🎯 Фокус: ${state.focus}% ${state.focus !== state.focus_adjusted ? `(${state.focus_adjusted}% с циркадным ритмом)` : ''}
💪 Мотивация: ${state.motivation}/10
😰 Стресс: ${state.stress}/10

**Режим:**
${this.getUIModeFullDescription(state.ui_mode)}

${circadianEmoji} **Циркадный ритм:**
${state.circadian.description}
Коэффициент: ${state.circadian.factor}
${state.is_peak_time ? '⭐ **Сейчас пиковое время продуктивности!**' : ''}

**Рекомендуемые часы работы:**
${state.peak_hours.join(', ')}

**Рекомендации:**
${recommendations.recommendations.slice(0, 3).map((r, i) => `${i + 1}. ${r}`).join('\n')}

**Режим работы:** ${this.getWorkModeText(recommendations.work_mode)}
${recommendations.break_needed ? `\n⏸️ **Рекомендуется перерыв на ${recommendations.break_duration} минут**` : ''}
      `;

      const keyboard: InlineKeyboard = {
        type: 'inline_keyboard',
        payload: {
          buttons: [
            [
              { type: 'callback', text: '🧪 Пройти тест', payload: 'test:menu' },
              { type: 'callback', text: '📊 Прогноз на день', payload: 'state:forecast' },
            ],
            [
              { type: 'callback', text: '🎯 MIT', payload: 'mit:show' },
              { type: 'callback', text: '📋 Задачи', payload: 'task:list' },
            ],
            [
              { type: 'callback', text: '↩️ Главное меню', payload: 'menu:main' }
            ],
          ],
        },
      };

      await this.messageSender.showScreen(maxUserId, text, keyboard);
    } catch (error) {
      this.logger.error(`Error showing state: ${error.message}`);
      await this.messageSender.showScreen(
        maxUserId,
        '❌ Ошибка при получении состояния.',
      );
    }
  }

  private async handleCancelCommand(maxUserId: string): Promise<void> {
    await this.userManager.clearUserState(maxUserId);
    await this.messageSender.showScreen(
      maxUserId,
      '✅ Текущее действие отменено.',
    );
    await this.sendMainMenu(maxUserId);
  }

  // ==================== Вспомогательные методы ====================

  private getTaskEmoji(priority: string): string {
    const emojiMap = {
      high: '🔴',
      medium: '🟡',
      low: '🟢',
    };
    return emojiMap[priority] || '⚪';
  }

  private getStatusEmoji(status: string): string {
    const emojiMap = {
      completed: '✅',
      in_progress: '⏳',
      pending: '📋',
      cancelled: '❌',
    };
    return emojiMap[status] || '📋';
  }

  private getTestInfo(testType: string): any {
    const testInfoMap = {
      energy: {
        name: 'Энергия',
        emoji: '⚡',
        description: 'Оценка вашего физического состояния и запаса энергии',
      },
      focus: {
        name: 'Фокус',
        emoji: '🎯',
        description: 'Способность концентрироваться на задачах',
      },
      motivation: {
        name: 'Мотивация',
        emoji: '💪',
        description: 'Ваше желание работать и достигать целей',
      },
      stress: {
        name: 'Стресс',
        emoji: '😰',
        description: 'Уровень напряжения и тревожности',
      },
    };

    return testInfoMap[testType];
  }

  private getMotivationalMessage(): string {
    const messages = [
      '💪 Вы справитесь! Эта задача идеально подходит под ваше текущее состояние.',
      '🚀 Сейчас лучшее время для этой задачи!',
      '🎯 Сфокусируйтесь на MIT — это ваш главный приоритет сегодня.',
      '⚡ У вас достаточно энергии для выполнения этой задачи!',
      '🌟 Отличный выбор! Эта задача поможет вам достичь целей.',
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }

  private getUIModeEmoji(mode: string): string {
    const map = {
      PEAK: '🚀',
      NORMAL: '✅',
      LOW: '⚠️',
      CRITICAL: '🚨',
    };
    return map[mode] || '📊';
  }

  private getCircadianEmoji(phase: string): string {
    const map = {
      WAKE_UP: '🌅',
      MORNING_PEAK: '☀️',
      MAXIMUM: '⭐',
      LUNCH: '🍽️',
      AFTERNOON_DIP: '😴',
      EVENING_PEAK: '🌆',
      EVENING: '🌙',
      NIGHT: '🌃',
    };
    return map[phase] || '🕐';
  }

  private getUIModeFullDescription(mode: string): string {
    const map = {
      PEAK: '🚀 **PEAK** — Пиковая продуктивность\nИдеальное время для сложных задач',
      NORMAL: '✅ **NORMAL** — Нормальное состояние\nПодходит для обычных задач',
      LOW: '⚠️ **LOW** — Сниженная продуктивность\nРекомендуются легкие задачи или отдых',
      CRITICAL: '🚨 **CRITICAL** — Критическое состояние\nНеобходим отдых и восстановление',
    };
    return map[mode] || mode;
  }

  private getWorkModeText(mode: string): string {
    const map = {
      DEEP_WORK: '🎯 Deep Work — максимальная концентрация',
      POMODORO: '🍅 Pomodoro — короткие сессии с перерывами',
      RECOVERY: '🛌 Recovery — режим восстановления',
      NORMAL: '📋 Normal — обычный режим работы',
    };
    return map[mode] || mode;
  }
}
