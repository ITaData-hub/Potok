import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { AdminClientService } from '../admin-client/admin-client.service';

@Injectable()
export class WebhookListenerService implements OnModuleInit {
  private readonly logger = new Logger(WebhookListenerService.name);

  constructor(private readonly adminClient: AdminClientService) {}

  async onModuleInit() {
    // Подписываемся на события распределения задач
    // Примечание: для реального pub/sub нужна отдельная реализация
    this.logger.log('Webhook listener initialized');
  }

  async handleTaskAssigned(data: any): Promise<void> {
    this.logger.log(`Task ${data.taskId} assigned to user ${data.userId}`);
    
    // Можно добавить дополнительную бизнес-логику
    // Например, отправить уведомление пользователю
  }
}
