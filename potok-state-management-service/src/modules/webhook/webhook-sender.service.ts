// src/modules/webhook/webhook-sender.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class WebhookSenderService {
  private readonly logger = new Logger(WebhookSenderService.name);
  private readonly gatewayWebhookUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.gatewayWebhookUrl = 
      this.configService.get<string>('GATEWAY_WEBHOOK_URL') || 
      'http://gateway-service:3001';
  }

  /**
   * Универсальный метод для отправки webhook-события
   */
  async send(eventType: string, data: any): Promise<void> {
    const url = `${this.gatewayWebhookUrl}/api/v1/webhook/${eventType}`;
    try {
      await firstValueFrom(
        this.httpService.post(url, data, {
          timeout: 5000,
          headers: {
            'Content-Type': 'application/json',
            'X-Service': 'state-management',
          },
        }),
      );
      this.logger.debug(`Webhook sent: ${eventType} data=${JSON.stringify(data)}`);
    } catch (error) {
      this.logger.error(`Failed to send webhook (${eventType}): ${error.message}`);
    }
  }

  async sendStateUpdated(userId: string, stateData: any): Promise<void> {
    await this.send('state-updated', {
      userId,
      energy: stateData.energy,
      focus: stateData.focus,
      motivation: stateData.motivation,
      stress: stateData.stress,
      ui_mode: stateData.ui_mode,
      timestamp: new Date().toISOString(),
    });
  }

  async sendBreakRecommendation(userId: string, reason: string): Promise<void> {
    await this.send('break-recommended', {
      userId,
      reason,
      timestamp: new Date().toISOString(),
    });
  }
}
