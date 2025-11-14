import { Controller, Post, Body, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { WebhookService } from './webhook.service';

@ApiTags('Webhooks')
@Controller('api/v1/webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(private readonly webhookService: WebhookService) {}


  
  @Post('state-updated')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive state update from State Management Service' })
  async handleStateUpdated(@Body() body: {
    userId: string;
    energy: number;
    focus: number;
    motivation: number;
    stress: number;
    ui_mode: string;
    timestamp: string;
  }) {
    this.logger.debug(`Received state update webhook for user ${body.userId}`);
    return await this.webhookService.handleStateUpdate(body);
  }

  @Post('test-completed')
@Public()
@HttpCode(HttpStatus.OK)
@ApiOperation({ summary: 'Receive test completion from State Service' })
async handleTestCompleted(@Body() body: {
  userId: string;
  testType: string;
  timestamp: string;
  result: any;
}) {
  this.logger.log(`📥 Received test-completed webhook for user ${body.userId}, type: ${body.testType}`);
  return await this.webhookService.handleTestCompleted(body);
}
  @Post('break-recommended')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive break recommendation from State Service' })
  async handleBreakRecommendation(@Body() body: {
    userId: string;
    reason: string;
    timestamp: string;
  }) {
    this.logger.debug(`Received break recommendation for user ${body.userId}`);
    return await this.webhookService.handleBreakRecommendation(body);
  }

  @Post('mit-calculated')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive MIT calculation from Task Service' })
  async handleMitCalculated(@Body() body: {
    userId: string;
    mit: any;
    timestamp: string;
  }) {
    this.logger.debug(`Received MIT calculation for user ${body.userId}`);
    return await this.webhookService.handleMitCalculated(body);
  }

  @Post('task-completed')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive task completion notification' })
  async handleTaskCompleted(@Body() body: {
    userId: string;
    taskId: string;
    completedAt: string;
  }) {
    this.logger.debug(`Received task completion for user ${body.userId}`);
    return await this.webhookService.handleTaskCompleted(body);
  }
}
