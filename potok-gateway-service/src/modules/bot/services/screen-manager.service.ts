import { Injectable, Logger } from '@nestjs/common';
import { AdminClientService } from '../../admin-client/admin-client.service';

interface ScreenData {
  messageId: string;
  chatId: string;
  timestamp: number;
  allMessageIds: string[]; // Все сообщения в текущем экране
}

@Injectable()
export class ScreenManager {
  private readonly logger = new Logger(ScreenManager.name);
  private readonly ACTIVE_SCREEN_PREFIX = 'active_screen:';
  private readonly SCREEN_TTL = 86400; // 24 часа

  constructor(private readonly adminClient: AdminClientService) {}

  private screenKey(userId: string) {
    return this.ACTIVE_SCREEN_PREFIX + userId;
  }

  /**
   * Установить активный экран
   */
  async setActiveScreen(userId: string, messageId: string, chatId: string): Promise<void> {
    const key = this.screenKey(userId);
    
    // Получаем текущий экран для сохранения истории
    const currentScreen = await this.getActiveScreenData(userId);
    const allMessageIds = currentScreen?.allMessageIds || [];
    
    const value = JSON.stringify({
      messageId,
      chatId,
      timestamp: Date.now(),
      allMessageIds: [messageId], // Новый экран начинается с одного сообщения
    });

    await this.adminClient.redisSet(key, value, this.SCREEN_TTL);
    this.logger.debug(`Set active screen for ${userId}: ${messageId}`);
  }

  /**
   * Добавить сообщение в текущий экран (от пользователя или бота)
   */
  async addMessageToScreen(userId: string, messageId: string): Promise<void> {
    const key = this.screenKey(userId);
    const currentScreen = await this.getActiveScreenData(userId);

    if (!currentScreen) {
      this.logger.warn(`No active screen for user ${userId}, cannot add message`);
      return;
    }

    // Добавляем messageId в список
    const allMessageIds = currentScreen.allMessageIds || [currentScreen.messageId];
    if (!allMessageIds.includes(messageId)) {
      allMessageIds.push(messageId);
    }

    const value = JSON.stringify({
      ...currentScreen,
      allMessageIds,
    });

    await this.adminClient.redisSet(key, value, this.SCREEN_TTL);
    this.logger.debug(`Added message ${messageId} to screen for ${userId}`);
  }

  /**
   * Получить данные активного экрана
   */
  async getActiveScreenData(userId: string): Promise<ScreenData | null> {
    const key = this.screenKey(userId);
    const value = await this.adminClient.redisGet(key);

    if (!value) return null;

    try {
      return JSON.parse(value);
    } catch (error) {
      this.logger.error(`Failed to parse screen data for ${userId}: ${error.message}`);
      return null;
    }
  }

  /**
   * Получить все сообщения текущего экрана
   */
  async getAllScreenMessages(userId: string): Promise<string[]> {
    const screenData = await this.getActiveScreenData(userId);
    if (!screenData) return [];
    
    return screenData.allMessageIds || [screenData.messageId];
  }

  /**
   * Очистить активный экран
   */
  async clearActiveScreen(userId: string): Promise<void> {
    const key = this.screenKey(userId);
    await this.adminClient.redisDel(key);
    this.logger.debug(`Cleared active screen for ${userId}`);
  }
}
