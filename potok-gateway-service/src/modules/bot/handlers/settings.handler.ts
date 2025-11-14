// src/modules/bot/handlers/settings.handler.ts
import { Injectable, Logger } from '@nestjs/common';
import { MessageSender } from '../services/message-sender.service';
import { UserManager } from '../services/user-manager.service';
import { InlineKeyboard } from '../bot.service';

@Injectable()
export class SettingsHandler {
  private readonly logger = new Logger(SettingsHandler.name);

  constructor(
    private readonly messageSender: MessageSender,
    private readonly userManager: UserManager,
  ) {}

  async handleCallback(maxUserId: string, params: string[]): Promise<void> {
    const action = params[0];

    switch (action) {
      case 'menu':
        await this.showSettingsMenu(maxUserId);
        break;
      case 'toggle_notifications':
        await this.toggleNotifications(maxUserId);
        break;
      case 'toggle_reminders':
        await this.toggleReminders(maxUserId);
        break;
      case 'work_hours':
        await this.showWorkHoursMenu(maxUserId);
        break;
      case 'set_start_time':
        await this.askStartTime(maxUserId);
        break;
      case 'set_end_time':
        await this.askEndTime(maxUserId);
        break;
      case 'start_time':
        // Собираем время из всех параметров (params[1] и params[2] если есть двоеточие)
        const startTime = params.slice(1).join(':');
        await this.setStartTime(maxUserId, startTime);
        break;
      case 'end_time':
        // Собираем время из всех параметров (params[1] и params[2] если есть двоеточие)
        const endTime = params.slice(1).join(':');
        await this.setEndTime(maxUserId, endTime);
        break;
      default:
        this.logger.warn(`Unknown settings action: ${action}`);
    }
  }

  async handleWorkHoursInput(maxUserId: string, text: string): Promise<void> {
    const user = await this.userManager.getUserByMaxId(maxUserId);
    if (!user) return;

    const userState = await this.userManager.getUserState(maxUserId);

    if (userState === 'awaiting_start_time') {
      await this.setStartTime(maxUserId, text);
    } else if (userState === 'awaiting_end_time') {
      await this.setEndTime(maxUserId, text);
    }
  }

  private async showSettingsMenu(maxUserId: string): Promise<void> {
    const user = await this.userManager.getUserByMaxId(maxUserId);
    if (!user) return;

    const settings = await this.userManager.getUserSettings(user.id);

    const text = `
⚙️ **Настройки**

🔔 **Уведомления:**
${settings.notifications_enabled ? '✅ Включены' : '❌ Отключены'}

🧪 **Напоминания о тестах:**
${settings.test_reminders ? '✅ Включены' : '❌ Отключены'}

📅 **Рабочие часы:**
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
            { type: 'callback', text: '⏰ Изменить рабочие часы', payload: 'settings:work_hours' },
          ],
          [{ type: 'callback', text: '↩️ Главное меню', payload: 'menu:main' }],
        ],
      },
    };

    await this.messageSender.showScreen(maxUserId, text, keyboard);
  }

  private async toggleNotifications(maxUserId: string): Promise<void> {
    const user = await this.userManager.getUserByMaxId(maxUserId);
    if (!user) return;

    const settings = await this.userManager.getUserSettings(user.id);
    const newValue = !settings.notifications_enabled;

    await this.userManager.updateUserSettings(user.id, {
      notifications_enabled: newValue,
    });

    await this.messageSender.showScreen(
      maxUserId,
      newValue ? '✅ Уведомления включены' : '🔕 Уведомления отключены',
    );

    await this.showSettingsMenu(maxUserId);
  }

  private async toggleReminders(maxUserId: string): Promise<void> {
    const user = await this.userManager.getUserByMaxId(maxUserId);
    if (!user) return;

    const settings = await this.userManager.getUserSettings(user.id);
    const newValue = !settings.test_reminders;

    await this.userManager.updateUserSettings(user.id, {
      test_reminders: newValue,
    });

    await this.messageSender.showScreen(
      maxUserId,
      newValue
        ? '✅ Напоминания о тестах включены'
        : '❌ Напоминания о тестах отключены',
    );

    await this.showSettingsMenu(maxUserId);
  }

  private async showWorkHoursMenu(maxUserId: string): Promise<void> {
    const text = `
⏰ **Настройка рабочих часов**

Выберите, что хотите изменить:
`;

    const keyboard: InlineKeyboard = {
      type: 'inline_keyboard',
      payload: {
        buttons: [
          [
            { type: 'callback', text: '🌅 Время начала', payload: 'settings:set_start_time' },
            { type: 'callback', text: '🌆 Время окончания', payload: 'settings:set_end_time' },
          ],
          [{ type: 'callback', text: '↩️ Назад', payload: 'settings:menu' }],
        ],
      },
    };

    await this.messageSender.showScreen(maxUserId, text, keyboard);
  }

  private async askStartTime(maxUserId: string): Promise<void> {
    const text = `
🌅 **Время начала рабочего дня**

Вы можете:
• Нажать на одну из кнопок ниже
• Ввести время текстом в формате **ЧЧ:ММ** (например: \`09:00\`)
`;

    const keyboard: InlineKeyboard = {
      type: 'inline_keyboard',
      payload: {
        buttons: [
          [
            { type: 'callback', text: '07:00', payload: 'settings:start_time:07:00' },
            { type: 'callback', text: '08:00', payload: 'settings:start_time:08:00' },
            { type: 'callback', text: '09:00', payload: 'settings:start_time:09:00' },
          ],
          [
            { type: 'callback', text: '10:00', payload: 'settings:start_time:10:00' },
            { type: 'callback', text: '11:00', payload: 'settings:start_time:11:00' },
            { type: 'callback', text: '12:00', payload: 'settings:start_time:12:00' },
          ],
          [{ type: 'callback', text: '↩️ Отмена', payload: 'settings:menu' }],
        ],
      },
    };

    await this.messageSender.showScreen(maxUserId, text, keyboard);
    await this.userManager.setUserState(maxUserId, 'awaiting_start_time');
  }

  private async askEndTime(maxUserId: string): Promise<void> {
    const text = `
🌆 **Время окончания рабочего дня**

Вы можете:
• Нажать на одну из кнопок ниже
• Ввести время текстом в формате **ЧЧ:ММ** (например: \`18:00\`)
`;

    const keyboard: InlineKeyboard = {
      type: 'inline_keyboard',
      payload: {
        buttons: [
          [
            { type: 'callback', text: '16:00', payload: 'settings:end_time:16:00' },
            { type: 'callback', text: '17:00', payload: 'settings:end_time:17:00' },
            { type: 'callback', text: '18:00', payload: 'settings:end_time:18:00' },
          ],
          [
            { type: 'callback', text: '19:00', payload: 'settings:end_time:19:00' },
            { type: 'callback', text: '20:00', payload: 'settings:end_time:20:00' },
            { type: 'callback', text: '21:00', payload: 'settings:end_time:21:00' },
          ],
          [{ type: 'callback', text: '↩️ Отмена', payload: 'settings:menu' }],
        ],
      },
    };

    await this.messageSender.showScreen(maxUserId, text, keyboard);
    await this.userManager.setUserState(maxUserId, 'awaiting_end_time');
  }

  private async setStartTime(maxUserId: string, time: string): Promise<void> {
    this.logger.debug(`Setting start time for user ${maxUserId}: ${time}`);
    
    if (!this.validateTime(time)) {
      await this.messageSender.showScreen(
        maxUserId,
        '❌ Неверный формат времени. Используйте формат ЧЧ:ММ (например, 09:00)',
      );
      await this.askStartTime(maxUserId); // Показываем меню снова
      return;
    }

    const user = await this.userManager.getUserByMaxId(maxUserId);
    if (!user) {
      this.logger.error(`User not found: ${maxUserId}`);
      return;
    }

    await this.userManager.updateUserSettings(user.id, {
      work_start_time: time,
    });

    await this.userManager.clearUserState(maxUserId);
    await this.messageSender.showScreen(
      maxUserId,
      `✅ Время начала рабочего дня установлено: **${time}**`,
    );
    
    // Небольшая задержка перед показом меню
    await new Promise(resolve => setTimeout(resolve, 500));
    await this.showSettingsMenu(maxUserId);
  }

  private async setEndTime(maxUserId: string, time: string): Promise<void> {
    this.logger.debug(`Setting end time for user ${maxUserId}: ${time}`);
    
    if (!this.validateTime(time)) {
      await this.messageSender.showScreen(
        maxUserId,
        '❌ Неверный формат времени. Используйте формат ЧЧ:ММ (например, 18:00)',
      );
      await this.askEndTime(maxUserId); // Показываем меню снова
      return;
    }

    const user = await this.userManager.getUserByMaxId(maxUserId);
    if (!user) {
      this.logger.error(`User not found: ${maxUserId}`);
      return;
    }

    await this.userManager.updateUserSettings(user.id, {
      work_end_time: time,
    });

    await this.userManager.clearUserState(maxUserId);
    await this.messageSender.showScreen(
      maxUserId,
      `✅ Время окончания рабочего дня установлено: **${time}**`,
    );
    
    // Небольшая задержка перед показом меню
    await new Promise(resolve => setTimeout(resolve, 500));
    await this.showSettingsMenu(maxUserId);
  }

  private validateTime(time: string): boolean {
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    const isValid = timeRegex.test(time);
    
    if (!isValid) {
      this.logger.warn(`Invalid time format: ${time}`);
    }
    
    return isValid;
  }
}
