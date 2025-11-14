import { Injectable, Logger } from '@nestjs/common';
// УДАЛИТЕ: import { RedisService } from '../redis/redis.service';

export interface WebhookSubscription {
  id: string;
  url: string;
  events: string[];
  userId: string;
  createdAt: Date;
}

@Injectable()
export class WebhookSubscriptionService {
  private readonly logger = new Logger(WebhookSubscriptionService.name);
  private subscriptions: Map<string, WebhookSubscription> = new Map();
  private idCounter = 1;

  // ДОБАВЛЕНО: create метод
  async create(dto: { url: string; events: string[]; userId: string }): Promise<WebhookSubscription> {
    const subscription: WebhookSubscription = {
      id: `sub_${this.idCounter++}`,
      url: dto.url,
      events: dto.events,
      userId: dto.userId,
      createdAt: new Date(),
    };
    
    this.subscriptions.set(subscription.id, subscription);
    this.logger.log(`Created webhook subscription: ${subscription.id}`);
    
    return subscription;
  }

  // ДОБАВЛЕНО: findAll метод
  async findAll(): Promise<WebhookSubscription[]> {
    return Array.from(this.subscriptions.values());
  }

  // ДОБАВЛЕНО: findById метод
  async findById(id: string): Promise<WebhookSubscription | null> {
    return this.subscriptions.get(id) || null;
  }

  // ДОБАВЛЕНО: delete метод
  async delete(id: string): Promise<boolean> {
    return this.subscriptions.delete(id);
  }

  async getSubscriptionsByUserId(userId: string): Promise<WebhookSubscription[]> {
    return Array.from(this.subscriptions.values()).filter(sub => sub.userId === userId);
  }
}
