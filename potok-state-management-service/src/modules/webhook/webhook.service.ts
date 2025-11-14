import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);
  private readonly webhookUrl: string;
  private readonly webhookSecret: string;

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
  ) {
    this.webhookUrl = this.configService.get<string>('webhook.url') || "";
    this.webhookSecret = this.configService.get<string>('webhook.secret') || "";
  }

  /**
   * Отправить webhook о завершении теста
   */
  async sendTestCompleted(userId: string, data: any): Promise<void> {
    if (!this.webhookUrl) {
      this.logger.warn('Webhook URL not configured');
      return;
    }

    const payload = {
      event: 'test.completed',
      user_id: userId,
      timestamp: new Date().toISOString(),
      data,
    };

    await this.sendWebhook(payload);
  }

  /**
   * Отправить webhook о изменении UI режима
   */
  async sendUIModeChanged(
    userId: string,
    oldMode: string,
    newMode: string,
  ): Promise<void> {
    if (!this.webhookUrl) {
      return;
    }

    const payload = {
      event: 'ui_mode.changed',
      user_id: userId,
      timestamp: new Date().toISOString(),
      data: {
        old_mode: oldMode,
        new_mode: newMode,
      },
    };

    await this.sendWebhook(payload);
  }

  /**
   * Отправить webhook о критичном состоянии
   */
  async sendCriticalState(userId: string, state: any): Promise<void> {
    if (!this.webhookUrl) {
      return;
    }

    const payload = {
      event: 'state.critical',
      user_id: userId,
      timestamp: new Date().toISOString(),
      data: state,
    };

    await this.sendWebhook(payload);
  }

  /**
   * Отправить webhook
   */
  private async sendWebhook(payload: any): Promise<void> {
    try {
      const signature = this.generateSignature(payload);

      await firstValueFrom(
        this.httpService.post(this.webhookUrl, payload, {
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': signature,
          },
          timeout: 5000,
        }),
      );

      this.logger.log(`Webhook sent: ${payload.event}`);
    } catch (error) {
      this.logger.error(
        `Failed to send webhook: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Генерация подписи для webhook
   */
  private generateSignature(payload: any): string {
    const data = JSON.stringify(payload);
    return crypto
      .createHmac('sha256', this.webhookSecret)
      .update(data)
      .digest('hex');
  }
}
