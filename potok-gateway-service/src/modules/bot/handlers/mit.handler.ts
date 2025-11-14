// src/modules/bot/handlers/mit.handler.ts
import { Injectable, Logger } from '@nestjs/common';
import { MessageSender } from '../services/message-sender.service';
import { UserManager } from '../services/user-manager.service';
import { ServiceIntegration } from '../services/service-integration.service';
import { InlineKeyboard } from '../bot.service';
import { AdminClientService } from 'src/modules/admin-client/admin-client.service';

@Injectable()
export class MitHandler {
  private readonly logger = new Logger(MitHandler.name);

  constructor(
    private readonly messageSender: MessageSender,
    private readonly userManager: UserManager,
    private readonly serviceIntegration: ServiceIntegration,
    private readonly adminClient: AdminClientService,
  ) {}

  async handleCallback(maxUserId: string, params: string[]): Promise<void> {
    const action = params[0];

    switch (action) {
      case 'show':
        await this.showMIT(maxUserId);
        break;
      case 'recalculate':
        await this.recalculateMIT(maxUserId);
        break;
      case 'complete':
        await this.completeMIT(maxUserId);
        break;
      default:
        this.logger.warn(`Unknown MIT action: ${action}`);
    }
  }

  private async showMIT(maxUserId: string): Promise<void> {
    const user = await this.userManager.getUserByMaxId(maxUserId);

    if (!user) {
      await this.messageSender.showScreen(
        maxUserId,
        '❌ Пользователь не найден. Используйте /start',
      );
      return;
    }

    this.logger.log(`📋 Showing MIT for user ${user.id} (${maxUserId})`);

    await this.messageSender.showScreen(maxUserId, '🔄 Вычисляю вашу MIT...');

    try {
      const mit = await this.serviceIntegration.calculateMIT(user.id);

      if (!mit) {
        const keyboard: InlineKeyboard = {
          type: 'inline_keyboard',
          payload: {
            buttons: [
              [
                { type: 'callback', text: '➕ Добавить задачу', payload: 'task:add' },
                { type: 'callback', text: '🧪 Пройти тест', payload: 'test:menu' },
              ],
              [{ type: 'callback', text: '↩️ Главное меню', payload: 'menu:main' }],
            ],
          },
        };

        await this.messageSender.showScreen(
          maxUserId,
          '🤷‍♂️ Не удалось определить MIT.\n\n' +
          'Возможные причины:\n' +
          '• Нет активных задач — добавьте через кнопку ниже\n' +
          '• Не пройдены тесты состояния — пройдите тест',
          keyboard,
        );
        return;
      }

      // ✅ КРИТИЧНО: Проверяем владельца MIT задачи
      const task = await this.serviceIntegration.getTask(mit.taskId);
      
      if (!task) {
        this.logger.error(`❌ MIT task ${mit.taskId} not found in database`);
        await this.messageSender.showScreen(
          maxUserId,
          '❌ Ошибка: задача MIT не найдена в базе данных.',
        );
        return;
      }

      if (task.user_id !== user.id) {
        this.logger.error(
          `🚨 SECURITY BREACH: User ${user.id} (${maxUserId}) got MIT task ${mit.taskId} owned by ${task.user_id}`
        );
        
        // Инвалидируем неправильный кеш
        await this.adminClient.redisDel(`potok:distribution:user:${user.id}:mit`);
        await this.adminClient.redisDel(`potok:distribution:user:${user.id}:tasks:sorted`);
        
        await this.messageSender.showScreen(
          maxUserId,
          '❌ Обнаружена ошибка в системе. Кеш очищен. Попробуйте снова через /mit',
        );
        return;
      }

      this.logger.log(`✅ MIT verified: task ${mit.taskId} belongs to user ${user.id}`);

      // Задача принадлежит пользователю - показываем MIT
      await this.displayMIT(maxUserId, mit);
      
    } catch (error) {
      this.logger.error(`Error showing MIT: ${error.message}`, error.stack);
      await this.messageSender.showScreen(
        maxUserId,
        '❌ Ошибка при получении MIT. Попробуйте позже.',
      );
    }
  }

  private async displayMIT(maxUserId: string, mit: any): Promise<void> {
    const text = `
🎯 **Ваша самая важная задача (MIT):**

**${mit.title}**

${mit.description || ''}

💡 **Почему именно эта задача?**
${mit.reason}

⏰ **Рекомендуемое время:** ${mit.recommended_time}
⏱️ **Примерная длительность:** ${mit.estimated_duration} минут

📊 **Приоритет:** ${mit.priority_score.toFixed(2)}/10
🎯 **Соответствие состоянию:** ${Math.round(mit.state_match_score * 100)}%

${this.getMotivationalMessage()}
`;

    const keyboard: InlineKeyboard = {
      type: 'inline_keyboard',
      payload: {
        buttons: [
          [
            { type: 'callback', text: '✅ Начать выполнение', payload: `task:start:${mit.taskId}` },
          ],
          [
            { type: 'callback', text: '🔄 Пересчитать', payload: 'mit:recalculate' },
            { type: 'callback', text: '📋 Все задачи', payload: 'task:list' },
          ],
          [{ type: 'callback', text: '↩️ Главное меню', payload: 'menu:main' }],
        ],
      },
    };

    await this.messageSender.showScreen(maxUserId, text, keyboard);
  }

  private async recalculateMIT(maxUserId: string): Promise<void> {
    const user = await this.userManager.getUserByMaxId(maxUserId);
    if (!user) return;

    this.logger.log(`🔄 Recalculating MIT for user ${user.id} (${maxUserId})`);

    // Очистить все связанные кеши
    await this.adminClient.redisDel(`potok:distribution:user:${user.id}:mit`);
    await this.adminClient.redisDel(`potok:distribution:user:${user.id}:tasks:sorted`);
    
    await this.messageSender.showScreen(
      maxUserId,
      '🔄 Пересчитываю MIT с учетом актуального состояния...',
    );

    await this.showMIT(maxUserId);
  }

  private async completeMIT(maxUserId: string): Promise<void> {
    const text = '🎉 Отличная работа! MIT завершена!\n\nХотите увидеть следующую важную задачу?';

    const keyboard: InlineKeyboard = {
      type: 'inline_keyboard',
      payload: {
        buttons: [
          [{ type: 'callback', text: '🎯 Показать новую MIT', payload: 'mit:recalculate' }],
          [{ type: 'callback', text: '📋 Все задачи', payload: 'task:list' }],
          [{ type: 'callback', text: '↩️ Главное меню', payload: 'menu:main' }],
        ],
      },
    };

    await this.messageSender.showScreen(maxUserId, text, keyboard);
  }

  private getMotivationalMessage(): string {
    const messages = [
      '💪 Вы справитесь! Эта задача идеально подходит под ваше текущее состояние.',
      '🚀 Сейчас лучшее время для этой задачи!',
      '🎯 Сфокусируйтесь на MIT — это ваш главный приоритет сегодня.',
      '⚡ У вас достаточно энергии для выполнения этой задачи!',
      '🌟 Отличный выбор! Эта задача поможет вам достичь целей.',
      '🔥 Время действовать! У вас все получится!',
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }
}

