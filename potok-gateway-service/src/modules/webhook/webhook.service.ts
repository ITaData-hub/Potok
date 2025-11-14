import { Injectable, Logger } from '@nestjs/common';
import { WebsocketService } from '../websocket/websocket.service';
import { BotService } from '../bot/bot.service';
import { AdminClientService } from '../admin-client/admin-client.service';
import { ServiceIntegration } from '../bot/services/service-integration.service';
import { StressReliefHandler } from '../bot/handlers/stress-relief.handler'; // ДОБАВИТЬ

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly websocketService: WebsocketService,
    private readonly botService: BotService,
    private readonly adminClient: AdminClientService,
    private readonly serviceIntegration: ServiceIntegration,
    private readonly stressReliefHandler: StressReliefHandler, // ДОБАВИТЬ
  ) {}

  async handleStateUpdate(data: any): Promise<any> {
    const { userId, energy, focus, motivation, stress, ui_mode } = data;
    this.logger.log(`Processing state update for user ${userId}: ${ui_mode}`);

    try {
      // Отправляем через WebSocket
      if (this.websocketService.isUserOnline(userId)) {
        this.websocketService.notifyStateUpdate(userId, data);
      }

      // Получаем max_user_id для отправки в бот
      const user = await this.getUserById(userId);
      if (user && user.max_user_id) {
        // ИЗМЕНИТЬ: использовать StressReliefHandler для критического состояния
        if (ui_mode === 'CRITICAL' || stress > 7 || energy < 3) {
          await this.stressReliefHandler.sendCriticalAlert(user.max_user_id, data);
        } else if (ui_mode === 'PEAK') {
          const mit = await this.serviceIntegration.calculateMIT(userId);
          if (mit) {
            await this.botService.sendMessage(
              user.max_user_id,
              `⚡ **У вас пиковое состояние!**\n\n` +
              `Отличное время для вашей MIT:\n` +
              `🎯 ${mit.title}\n\n` +
              `Используйте /mit для подробностей.`,
            );
          }
        }
      }

      // Инвалидируем кеш MIT
      await this.adminClient.redisDel(`potok:distribution:user:${userId}:mit`);
      return { success: true };
    } catch (error) {
      this.logger.error(`Error handling state update: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async handleTestCompleted(data: any): Promise<{ success: boolean }> {
    const { userId, testType, result } = data;
    this.logger.log(`Processing test completion for user ${userId}: ${testType}`);
    
    try {
      // Можно отправить уведомление пользователю через бота
      const user = await this.getUserById(userId);
      if (user && user.max_user_id) {
        // Опционально: уведомить пользователя
        this.logger.debug(`Test ${testType} completed for max_user_id: ${user.max_user_id}`);
      }
      
      return { success: true };
    } catch (error) {
      this.logger.error(`Error handling test completed: ${error.message}`);
      return { success: false };
    }
  }
  async handleBreakRecommendation(data: any): Promise<any> {
    const { userId, reason } = data;
    try {
      if (this.websocketService.isUserOnline(userId)) {
        this.websocketService.notifyBreakRecommendation(userId, reason);
      }

      const user = await this.getUserById(userId);
      if (user && user.max_user_id) {
        await this.botService.sendMessage(
          user.max_user_id,
          `⏸️ **Рекомендация: сделайте перерыв**\n\n${reason}\n\n` +
          `Короткий перерыв поможет восстановить продуктивность.`,
        );
      }

      return { success: true };
    } catch (error) {
      this.logger.error(`Error handling break recommendation: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async handleMitCalculated(data: any): Promise<any> {
    const { userId, mit } = data;
    try {
      if (this.websocketService.isUserOnline(userId)) {
        this.websocketService.notifyMitRecommended(userId, mit);
      }

      return { success: true };
    } catch (error) {
      this.logger.error(`Error handling MIT calculated: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async handleTaskCompleted(data: any): Promise<any> {
    const { userId, taskId } = data;
    try {
      const user = await this.getUserById(userId);
      if (user && user.max_user_id) {
        await this.botService.sendMessage(
          user.max_user_id,
          '🎉 **Задача завершена!**\n\nОтличная работа! Хотите узнать следующую MIT?',
        );
      }

      // Инвалидируем кеши
      await this.adminClient.redisDel(`potok:distribution:user:${userId}:mit`);
      await this.adminClient.redisDel(`potok:distribution:user:${userId}:tasks:sorted`);

      return { success: true };
    } catch (error) {
      this.logger.error(`Error handling task completed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  private async getUserById(userId: string): Promise<any> {
    try {
      return await this.adminClient.dbGet('users', userId);
    } catch (error) {
      this.logger.error(`Error getting user: ${error.message}`);
      return null;
    }
  }
}
