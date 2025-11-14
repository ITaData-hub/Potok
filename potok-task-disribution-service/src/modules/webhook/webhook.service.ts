import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ITask } from '../../common/interfaces/task.interface';

export enum WebhookEventType {
  TASK_SCHEDULED = 'task.scheduled',
  TASK_RESCHEDULED = 'task.rescheduled',
  MIT_SELECTED = 'mit.selected',
  WORKLOAD_WARNING = 'workload.warning',
  REST_MODE_ACTIVATED = 'rest_mode.activated',
  DEADLINE_WARNING = 'deadline.warning',
  DISTRIBUTION_COMPLETED = 'distribution.completed',
}

export interface IWebhookPayload {
  eventType: WebhookEventType;
  userId: string;
  timestamp: Date;
  correlationId: string;
  data: any;
}

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);
  private readonly webhookUrl: string;
  private readonly webhookSecret: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.webhookUrl = this.configService.get<string>('WEBHOOK_URL');
    this.webhookSecret = this.configService.get<string>('WEBHOOK_SECRET');
  }

  async sendWebhook(payload: IWebhookPayload): Promise<void> {
    if (!this.webhookUrl) {
      this.logger.warn('Webhook URL not configured, skipping webhook send');
      return;
    }

    try {
      this.logger.log({
        message: 'Sending webhook',
        eventType: payload.eventType,
        userId: payload.userId,
        correlationId: payload.correlationId,
      });

      const response = await firstValueFrom(
        this.httpService.post(this.webhookUrl, payload, {
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Secret': this.webhookSecret,
            'X-Correlation-Id': payload.correlationId,
          },
          timeout: 5000,
        }),
      );

      this.logger.log({
        message: 'Webhook sent successfully',
        eventType: payload.eventType,
        statusCode: response.status,
        correlationId: payload.correlationId,
      });
    } catch (error) {
      this.logger.error({
        message: 'Failed to send webhook',
        eventType: payload.eventType,
        error: error.message,
        correlationId: payload.correlationId,
      });
    }
  }

  async notifyTaskScheduled(
    userId: string,
    task: ITask,
    correlationId: string,
  ): Promise<void> {
    await this.sendWebhook({
      eventType: WebhookEventType.TASK_SCHEDULED,
      userId,
      timestamp: new Date(),
      correlationId,
      data: { task },
    });
  }

  async notifyMitSelected(
    userId: string,
    mit: ITask,
    correlationId: string,
  ): Promise<void> {
    await this.sendWebhook({
      eventType: WebhookEventType.MIT_SELECTED,
      userId,
      timestamp: new Date(),
      correlationId,
      data: { mit },
    });
  }

  async notifyWorkloadWarning(
    userId: string,
    message: string,
    workloadData: any,
    correlationId: string,
  ): Promise<void> {
    await this.sendWebhook({
      eventType: WebhookEventType.WORKLOAD_WARNING,
      userId,
      timestamp: new Date(),
      correlationId,
      data: { message, workloadData },
    });
  }

  async notifyRestModeActivated(
    userId: string,
    reason: string,
    correlationId: string,
  ): Promise<void> {
    await this.sendWebhook({
      eventType: WebhookEventType.REST_MODE_ACTIVATED,
      userId,
      timestamp: new Date(),
      correlationId,
      data: { reason },
    });
  }

  async notifyDeadlineWarning(
    userId: string,
    task: ITask,
    reason: string,
    correlationId: string,
  ): Promise<void> {
    await this.sendWebhook({
      eventType: WebhookEventType.DEADLINE_WARNING,
      userId,
      timestamp: new Date(),
      correlationId,
      data: { task, reason },
    });
  }

  async notifyDistributionCompleted(
    userId: string,
    summary: any,
    correlationId: string,
  ): Promise<void> {
    await this.sendWebhook({
      eventType: WebhookEventType.DISTRIBUTION_COMPLETED,
      userId,
      timestamp: new Date(),
      correlationId,
      data: summary,
    });
  }
}
