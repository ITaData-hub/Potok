import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// УДАЛИТЕ: import { RedisService } from '../redis/redis.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private subscriptions: Map<string, Set<string>> = new Map(); // userId -> Set<webhookUrls>

  constructor(
    private readonly configService: ConfigService,
    // УДАЛИТЕ: private readonly redisService: RedisService,
  ) {}

  async subscribe(userId: string, webhookUrl: string): Promise<void> {
    if (!this.subscriptions.has(userId)) {
      this.subscriptions.set(userId, new Set());
    }
    this.subscriptions.get(userId)!.add(webhookUrl);
    this.logger.log(`User ${userId} subscribed to notifications`);
  }

  async unsubscribe(userId: string, webhookUrl: string): Promise<void> {
    const userSubs = this.subscriptions.get(userId);
    if (userSubs) {
      userSubs.delete(webhookUrl);
      if (userSubs.size === 0) {
        this.subscriptions.delete(userId);
      }
    }
    this.logger.log(`User ${userId} unsubscribed from notifications`);
  }

  async notify(userId: string, event: string, data: any): Promise<void> {
    const userSubs = this.subscriptions.get(userId);
    if (!userSubs || userSubs.size === 0) {
      return;
    }

    this.logger.log(`Notifying user ${userId} about ${event}`);
    
    // Здесь можно добавить отправку webhook через HTTP
    for (const webhookUrl of userSubs) {
      this.logger.debug(`Would send to: ${webhookUrl}`, { event, data });
      // TODO: Implement actual HTTP POST to webhook
    }
  }
}
