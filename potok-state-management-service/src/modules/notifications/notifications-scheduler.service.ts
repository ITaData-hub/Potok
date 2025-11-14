import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AdminClientService } from '../admin-client/admin-client.service';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class NotificationsSchedulerService {
  private readonly logger = new Logger(NotificationsSchedulerService.name);

  constructor(
    private readonly adminClient: AdminClientService,
    private readonly httpService: HttpService,
  ) {}

  @Cron('0 8 * * *', { name: 'energy-test', timeZone: 'Europe/Moscow' })
  async sendEnergyTestNotification() {
    this.logger.log('⚡ Sending Energy test notifications');
    await this.sendTestNotificationToAllUsers('energy', '08:00');
  }

  @Cron('0 12 * * *', { name: 'focus-test', timeZone: 'Europe/Moscow' })
  async sendFocusTestNotification() {
    this.logger.log('🎯 Sending Focus test notifications');
    await this.sendTestNotificationToAllUsers('focus', '12:00');
  }

  @Cron('0 15 * * *', { name: 'motivation-test', timeZone: 'Europe/Moscow' })
  async sendMotivationTestNotification() {
    this.logger.log('💪 Sending Motivation test notifications');
    await this.sendTestNotificationToAllUsers('motivation', '15:00');
  }

  @Cron('0 18 * * *', { name: 'stress-test', timeZone: 'Europe/Moscow' })
  async sendStressTestNotification() {
    this.logger.log('😰 Sending Stress test notifications');
    await this.sendTestNotificationToAllUsers('stress', '18:00');
  }

  private async sendTestNotificationToAllUsers(
    testType: string,
    scheduledTime: string
  ): Promise<void> {
    try {
      const users = await this.adminClient.dbList('users', {
        is_active: true,
      });

      const usersArray = Array.isArray(users) ? users : [];

      if (usersArray.length === 0) {
        this.logger.warn('No active users found');
        return;
      }

      const gatewayUrl = process.env.GATEWAY_WEBHOOK_URL || 'http://gateway-service:3001';
      const endpoint = `${gatewayUrl}/api/v1/notifications/test-reminder`;

      const batchSize = 10;
      for (let i = 0; i < usersArray.length; i += batchSize) {
        const batch = usersArray.slice(i, i + batchSize);
        
        await Promise.all(
          batch.map(user => this.sendNotification(endpoint, user.id, testType, scheduledTime))
        );

        if (i + batchSize < usersArray.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      this.logger.log(`✅ Sent ${testType} notifications to ${usersArray.length} users`);
    } catch (error) {
      this.logger.error(`Error sending notifications: ${error.message}`);
    }
  }

  private async sendNotification(
    endpoint: string,
    userId: string,
    testType: string,
    scheduledTime: string
  ): Promise<void> {
    try {
      await firstValueFrom(
        this.httpService.post(endpoint, { userId, testType, scheduledTime }, { timeout: 5000 })
      );
      this.logger.debug(`✅ Notification sent to user ${userId}`);
    } catch (error) {
      this.logger.warn(`Failed to send notification to user ${userId}: ${error.message}`);
    }
  }
}
