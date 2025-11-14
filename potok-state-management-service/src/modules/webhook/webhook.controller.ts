import { Controller, Get, Post, Delete, Body, Param, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { WebhookSubscription, WebhookSubscriptionService } from './webhook-subscription.service';
import { CreateWebhookSubscriptionDto } from './dto/webhook-subscription.dto';
import { WebhookSenderService } from './webhook-sender.service';

@ApiTags('Webhooks')
@Controller('api/v1/webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    private readonly subscriptionService: WebhookSubscriptionService,
    private readonly senderService: WebhookSenderService,
  ) {}

  // НОВЫЙ endpoint для получения уведомлений о завершении теста
  @Post('test-completed')
  @ApiOperation({ summary: 'Webhook для уведомления о завершении теста' })
  async handleTestCompleted(@Body() data: any): Promise<{ success: boolean }> {
    try {
      this.logger.log(`Test completed webhook received for user ${data.userId}, type: ${data.testType}`);
      
      // Здесь можно добавить дополнительную логику:
      // - Обновление статистики
      // - Отправка уведомлений подписчикам
      // - Триггер дополнительных действий
      
      // Рассылаем подписчикам
      await this.senderService.send('test.completed', data);
      
      return { success: true };
    } catch (error) {
      this.logger.error(`Error handling test completed webhook: ${error.message}`);
      return { success: false };
    }
  }

  @Post('subscriptions')
  @ApiOperation({ summary: 'Создать webhook подписку' })
  async createSubscription(@Body() dto: CreateWebhookSubscriptionDto): Promise<WebhookSubscription> {
    return this.subscriptionService.create({
      url: dto.url,
      events: dto.events,
      userId: dto.userId || 'system',
    });
  }

  @Get('subscriptions')
  @ApiOperation({ summary: 'Получить все подписки' })
  async getSubscriptions(): Promise<WebhookSubscription[]> {
    return this.subscriptionService.findAll();
  }

  @Get('subscriptions/:id')
  @ApiOperation({ summary: 'Получить подписку по ID' })
  async getSubscription(@Param('id') id: string): Promise<WebhookSubscription | null> {
    return this.subscriptionService.findById(id);
  }

  @Delete('subscriptions/:id')
  @ApiOperation({ summary: 'Удалить подписку' })
  async deleteSubscription(@Param('id') id: string): Promise<{ success: boolean }> {
    await this.subscriptionService.delete(id);
    return { success: true };
  }
}
