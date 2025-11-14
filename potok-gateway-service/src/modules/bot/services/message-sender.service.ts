import { Injectable, Logger } from '@nestjs/common';
import { ScreenManager } from './screen-manager.service';

@Injectable()
export class MessageSender {
  private readonly logger = new Logger(MessageSender.name);
  private contextMap = new Map();
  private bot: any;

  constructor(private readonly screenManager: ScreenManager) {}

  setBot(bot: any) {
    this.bot = bot;
    this.logger.log('Bot instance set in MessageSender');
  }

  saveContext(maxUserId: string, ctx: any) {
    this.contextMap.set(maxUserId, ctx);
    this.logger.debug(`Context saved for user ${maxUserId}`);
  }

  getContext(maxUserId: string): any {
    return this.contextMap.get(maxUserId);
  }


  /**
   * 🗑️ Удалить сообщение без ожидания (silent)
   */
  private deleteMessageSilently(ctx: any, messageId: string): void {
    ctx.deleteMessage(messageId).catch((error: Error) => {
      // Игнорируем ошибки удаления - не критично
      this.logger.debug(`Failed to delete message ${messageId}: ${error.message}`);
    });
  }

  /**
   * 📝 Отправить обычное сообщение (НЕ экран)
   */
  async sendNotification(
    maxUserId: string,
    text: string,
    keyboard?: any,
    options?: {
      format?: 'markdown' | 'html' | 'plain';
      link?: { type: 'reply' | 'forward'; mid: string };
      notify?: boolean;
    },
  ): Promise<void> {
    const ctx = this.getContext(maxUserId);
    if (!ctx) {
      this.logger.warn(`No context for user ${maxUserId}`);
      return;
    }

    try {
      const sendOptions: any = {
        format: options?.format || 'markdown',
      };
      if (keyboard) sendOptions.attachments = [keyboard];
      if (options?.link) sendOptions.link = options.link;
      if (options?.notify !== undefined) sendOptions.notify = options.notify;

      await ctx.reply(text, sendOptions);
      this.logger.debug(`✅ Sent notification to ${maxUserId}`);
    } catch (error) {
      this.logger.error(`❌ Failed to send notification: ${error.message}`);
    }
  }

  /**
   * 🔄 Legacy метод для совместимости
   */
  async sendMessage(
    maxUserId: string,
    text: string,
    keyboard?: any,
    options?: {
      format?: 'markdown' | 'html' | 'plain';
      link?: { type: 'reply' | 'forward'; mid: string };
      notify?: boolean;
    },
  ): Promise<void> {
    await this.showScreen(maxUserId, text, keyboard, options);
  }

  /**
   * 🗑️ Удалить сообщение (публичный метод)
   */
  async deleteMessage(chatId: string, messageMid: string | { mid: string }): Promise<void> {
    try {
      const mid = typeof messageMid === 'string' ? messageMid : messageMid.mid;
      this.logger.debug(`[MessageSender] Deleting message mid=${mid} in chat ${chatId}`);

      let ctx: any = null;
      for (const savedCtx of this.contextMap.values()) {
        const savedChatId = this.extractChatId(savedCtx);
        if (savedChatId === chatId) {
          ctx = savedCtx;
          break;
        }
      }

      if (!ctx) {
        this.logger.warn(`No context found for chat ${chatId}`);
        return;
      }

      await ctx.deleteMessage(mid);
      this.logger.debug(`✅ Message ${mid} deleted in chat ${chatId}`);
    } catch (error) {
      this.logger.error(`❌ Failed to delete message: ${error.message}`);
    }
  }

  private extractChatId(ctx: any): string | undefined {
    return (
      ctx?.update?.message?.chat?.id?.toString() ||
      ctx?.update?.message?.chat_id?.toString() ||
      ctx?.update?.message?.chatId?.toString() ||
      ctx?.update?.message?.recipient?.chat_id?.toString() ||
      ctx?.update?.callback?.message?.chat?.id?.toString() ||
      ctx?.update?.callback?.message?.chat_id?.toString() ||
      ctx?.update?.callback?.message?.chatId?.toString()
    );
  }

  /**
 * 🎯 ГЛАВНЫЙ МЕТОД - Показать экран с очисткой предыдущих сообщений
 */
async showScreen(
  maxUserId: string,
  text: string,
  keyboard?: any,
  options?: {
    format?: 'markdown' | 'html' | 'plain';
    link?: { type: 'reply' | 'forward'; mid: string };
    notify?: boolean;
    forceNew?: boolean;
    clearPrevious?: boolean; // НОВАЯ ОПЦИЯ - очистить предыдущие сообщения
  },
): Promise<{ messageId: string }> {
  const ctx = this.getContext(maxUserId);
  const chatId = this.extractChatId(ctx);

  if (!chatId) {
    this.logger.warn(`No chatId for user ${maxUserId}`);
    return { messageId: '' };
  }

  const sendOptions: any = {
    format: options?.format || 'markdown',
  };
  if (keyboard) sendOptions.attachments = [keyboard];
  if (options?.link) sendOptions.link = options.link;
  if (options?.notify !== undefined) sendOptions.notify = options.notify;

  // НОВОЕ: Если нужно очистить предыдущие сообщения
  if (options?.clearPrevious !== false) {
    await this.clearScreenMessages(maxUserId);
  }

  // Отправляем новое сообщение
  try {
    const sentMessage = await ctx.reply(text, sendOptions);
    const messageId = sentMessage?.body?.mid;

    if (messageId) {
      await this.screenManager.setActiveScreen(maxUserId, messageId, chatId);
      this.logger.debug(`✅ Screen updated for ${maxUserId} (msg: ${messageId})`);
    } else {
      this.logger.warn('ctx.reply did not return mid!');
    }

    return { messageId: messageId || '' };
  } catch (error) {
    this.logger.error(`❌ Failed to show screen: ${error.message}`);
    throw error;
  }
}

/**
 * 📤 Отправить сообщение и добавить его в трекинг текущего экрана
 */
async sendMessageAndTrack(
  maxUserId: string,
  text: string,
  keyboard?: any,
  options?: {
    format?: 'markdown' | 'html' | 'plain';
    link?: { type: 'reply' | 'forward'; mid: string };
    notify?: boolean;
  },
): Promise<{ messageId: string }> {
  const ctx = this.getContext(maxUserId);
  
  if (!ctx) {
    this.logger.warn(`No context for user ${maxUserId}`);
    return { messageId: '' };
  }

  try {
    const sendOptions: any = {
      format: options?.format || 'markdown',
    };
    if (keyboard) sendOptions.attachments = [keyboard];
    if (options?.link) sendOptions.link = options.link;
    if (options?.notify !== undefined) sendOptions.notify = options.notify;

    const sentMessage = await ctx.reply(text, sendOptions);
    const messageId = sentMessage?.body?.mid;

    if (messageId) {
      // ВАЖНО: Добавляем сообщение в текущий экран
      await this.screenManager.addMessageToScreen(maxUserId, messageId);
      this.logger.debug(`✅ Sent and tracked message ${messageId} for ${maxUserId}`);
    } else {
      this.logger.warn('ctx.reply did not return mid!');
    }

    return { messageId: messageId || '' };
  } catch (error) {
    this.logger.error(`❌ Failed to send message: ${error.message}`);
    throw error;
  }
}

/**
 * 🧹 Очистить все сообщения текущего экрана
 */
async clearScreenMessages(maxUserId: string): Promise<void> {
  const messageIds = await this.screenManager.getAllScreenMessages(maxUserId);
  
  if (messageIds.length === 0) {
    this.logger.debug('No messages to clear');
    return;
  }

  const ctx = this.getContext(maxUserId);
  if (!ctx) {
    this.logger.warn(`No context for user ${maxUserId}, cannot clear messages`);
    return;
  }

  this.logger.debug(`🧹 Clearing ${messageIds.length} messages for ${maxUserId}: ${JSON.stringify(messageIds)}`);

  // Удаляем все сообщения асинхронно
  for (const msgId of messageIds) {
    try {
      this.logger.debug(`🗑️ Attempting to delete message ${msgId}`);
      await ctx.deleteMessage(msgId);
      this.logger.debug(`✅ Successfully deleted message ${msgId}`);
    } catch (error) {
      this.logger.error(`❌ Failed to delete message ${msgId}: ${error.message}`);
    }
  }
}
/**
 * 📝 Трекать сообщение пользователя
 */
async trackUserMessage(maxUserId: string, messageId: string): Promise<void> {
  await this.screenManager.addMessageToScreen(maxUserId, messageId);
  this.logger.debug(`Tracked user message ${messageId} for ${maxUserId}`);
}
}
