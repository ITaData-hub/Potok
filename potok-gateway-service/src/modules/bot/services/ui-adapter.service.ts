import { Injectable } from '@nestjs/common';
import { InlineKeyboard } from '../bot.service';

@Injectable()
export class UIAdapterService {
  /**
   * Главное меню - адаптируется под UI Mode
   */
  getMainMenu(uiMode: string, userName?: string): { text: string; keyboard: InlineKeyboard } {
    switch (uiMode) {
      case 'PEAK':
        return this.getPeakMainMenu(userName);
      case 'LOW':
        return this.getLowMainMenu(userName);
      case 'CRITICAL':
        return this.getCriticalMainMenu(userName);
      default:
        return this.getNormalMainMenu(userName);
    }
  }

  private getNormalMainMenu(userName?: string): { text: string; keyboard: InlineKeyboard } {
    const name = userName ? `, ${userName}` : '';
    
    return {
      text: `🏠 **Главное меню**\n\nПривет${name}! Что будем делать?`,
      keyboard: {
        type: 'inline_keyboard',
        payload: {
          buttons: [
            [
              { type: 'callback', text: '📋 Задачи', payload: 'menu:tasks' },
              { type: 'callback', text: '🎯 Фокус', payload: 'menu:focus' },
            ],
            [
              { type: 'callback', text: '⚙️ Ещё', payload: 'menu:more' },
              { type: 'callback', text: '💬 Помощь', payload: 'menu:help' },
            ],
          ],
        },
      },
    };
  }

  private getPeakMainMenu(userName?: string): { text: string; keyboard: InlineKeyboard } {
    const name = userName ? `, ${userName}` : '';
    
    return {
      text: `🚀 **Пик продуктивности!**\n\nПривет${name}!\n\nИспользуйте это время для сложных задач!`,
      keyboard: {
        type: 'inline_keyboard',
        payload: {
          buttons: [
            [
              { type: 'callback', text: '🔥 Deep Work', payload: 'task:list:complex' },
              { type: 'callback', text: '🎯 MIT', payload: 'mit:show' },
            ],
            [
              { type: 'callback', text: '⚙️ Ещё', payload: 'menu:more' },
              { type: 'callback', text: '💬 Помощь', payload: 'menu:help' },
            ],
          ],
        },
      },
    };
  }

  private getLowMainMenu(userName?: string): { text: string; keyboard: InlineKeyboard } {
    const name = userName ? `, ${userName}` : '';
    
    return {
      text: `⚠️ **Снижена энергия**\n\nПривет${name}!\n\nРекомендуем простые задачи или отдых.`,
      keyboard: {
        type: 'inline_keyboard',
        payload: {
          buttons: [
            [
              { type: 'callback', text: '📝 Лёгкие задачи', payload: 'task:list:simple' },
              { type: 'callback', text: '☕ Перерыв', payload: 'stress:rest' },
            ],
            [
              { type: 'callback', text: '⚙️ Ещё', payload: 'menu:more' },
              { type: 'callback', text: '💬 Помощь', payload: 'menu:help' },
            ],
          ],
        },
      },
    };
  }

  private getCriticalMainMenu(userName?: string): { text: string; keyboard: InlineKeyboard } {
    const name = userName ? `, ${userName}` : '';
    
    return {
      text: `🚨 **КРИТИЧЕСКОЕ СОСТОЯНИЕ**\n\nПривет${name}!\n\n⚠️ Пожалуйста, отдохните!\nВаше здоровье важнее любых задач.`,
      keyboard: {
        type: 'inline_keyboard',
        payload: {
          buttons: [
            [
              { type: 'callback', text: '🧘 Дыхание', payload: 'stress:breathing' },
              { type: 'callback', text: '🚶 Рекомендации', payload: 'stress:rest' },
            ],
            [{ type: 'callback', text: '📊 Моё состояние', payload: 'stats:current' }],
            [{ type: 'callback', text: '↩️ Главная', payload: 'menu:main' }],
          ],
        },
      },
    };
  }

  /**
   * Меню "Задачи"
   */
  getTasksMenu(taskCount: number = 0): { text: string; keyboard: InlineKeyboard } {
    return {
      text: `📋 **Мои задачи**\n\nУ вас ${taskCount} ${this.pluralize(taskCount, 'задача', 'задачи', 'задач')}`,
      keyboard: {
        type: 'inline_keyboard',
        payload: {
          buttons: [
            [{ type: 'callback', text: '➕ Добавить задачу', payload: 'task:add' }],
            [{ type: 'callback', text: `📝 Список задач (${taskCount})`, payload: 'task:list' }],
            [{ type: 'callback', text: '🎯 Главная задача', payload: 'mit:show' }],
            [{ type: 'callback', text: '↩️ Назад', payload: 'menu:main' }],
          ],
        },
      },
    };
  }

  /**
   * Меню "Фокус"
   */
  getFocusMenu(): { text: string; keyboard: InlineKeyboard } {
    return {
      text: `🎯 **Режим фокуса**\n\nВыберите инструмент для продуктивности:`,
      keyboard: {
        type: 'inline_keyboard',
        payload: {
          buttons: [
            [{ type: 'callback', text: '🍅 Pomodoro', payload: 'pomodoro:status' }],
            [{ type: 'callback', text: '🧪 Пройти тест', payload: 'test:menu' }],
            [{ type: 'callback', text: '📊 Моя статистика', payload: 'stats:summary' }],
            [{ type: 'callback', text: '↩️ Назад', payload: 'menu:main' }],
          ],
        },
      },
    };
  }

  /**
   * Меню "Ещё"
   */
  getMoreMenu(): { text: string; keyboard: InlineKeyboard } {
    return {
      text: `⚙️ **Дополнительно**`,
      keyboard: {
        type: 'inline_keyboard',
        payload: {
          buttons: [
            [{ type: 'callback', text: '⚙️ Настройки', payload: 'settings:menu' }],
            [{ type: 'callback', text: '📊 Статистика', payload: 'stats:summary' }],
            [{ type: 'callback', text: '🧘 Антистресс', payload: 'menu:wellness' }],
            [{ type: 'callback', text: '💡 О системе', payload: 'menu:about' }],
            [{ type: 'callback', text: '↩️ Назад', payload: 'menu:main' }],
          ],
        },
      },
    };
  }

  /**
   * Меню "Антистресс"
   */
  getWellnessMenu(): { text: string; keyboard: InlineKeyboard } {
    return {
      text: `🧘 **Восстановление**\n\nВыберите упражнение:`,
      keyboard: {
        type: 'inline_keyboard',
        payload: {
          buttons: [
            [{ type: 'callback', text: '🌬️ Дыхание 4-7-8', payload: 'stress:breathing' }],
            [{ type: 'callback', text: '🚶 Рекомендации по отдыху', payload: 'stress:rest' }],
            [{ type: 'callback', text: '📊 Моё состояние', payload: 'stats:current' }],
            [{ type: 'callback', text: '↩️ Назад', payload: 'menu:more' }],
          ],
        },
      },
    };
  }

 /**
 * Меню "Помощь" - обновлённое
 */
getHelpMenu(): { text: string; keyboard: InlineKeyboard } {
    return {
      text: `💬 **Справка Potok**\n\nВыберите тему:`,
      keyboard: {
        type: 'inline_keyboard',
        payload: {
          buttons: [
            [{ type: 'callback', text: '🧪 Как работают тесты?', payload: 'help:tests' }],
            [{ type: 'callback', text: '🍅 Что такое Pomodoro?', payload: 'help:pomodoro' }],
            [{ type: 'callback', text: '📋 Управление задачами', payload: 'help:tasks' }],
            [{ type: 'callback', text: '🎯 Что такое MIT?', payload: 'help:mit' }],
            [{ type: 'callback', text: '🎨 UI режимы', payload: 'help:ui_modes' }],
            [{ type: 'callback', text: '↩️ Назад', payload: 'menu:main' }],
          ],
        },
      },
    };
  }

  /**
   * Меню "О системе"
   */
  getAboutMenu(): { text: string; keyboard: InlineKeyboard } {
    return {
      text: `💡 **О системе Potok**\n\nPotok - умный помощник для управления задачами и продуктивностью.\n\n**Возможности:**\n• Адаптивное планирование\n• Учёт вашего состояния\n• Рекомендации по работе\n• Pomodoro таймер\n• AI-генерация задач`,
      keyboard: {
        type: 'inline_keyboard',
        payload: {
          buttons: [
            [{ type: 'callback', text: '↩️ Назад', payload: 'menu:more' }],
          ],
        },
      },
    };
  }

  private pluralize(count: number, one: string, few: string, many: string): string {
    const mod10 = count % 10;
    const mod100 = count % 100;

    if (mod10 === 1 && mod100 !== 11) return one;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
    return many;
  }
}
