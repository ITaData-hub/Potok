import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ServiceIntegration } from '../../bot/services/service-integration.service';

@ApiTags('Gateway - Task Proxy')
@Controller('api/v1/gateway/tasks')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TaskProxyController {
  constructor(private readonly serviceIntegration: ServiceIntegration) {}

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get sorted tasks for user' })
  async getUserTasks(@Param('userId') userId: string) {
    return await this.serviceIntegration.getUserTasks(userId);
  }

  @Post('user/:userId/mit')
  @ApiOperation({ summary: 'Calculate MIT for user' })
  async calculateMIT(@Param('userId') userId: string) {
    return await this.serviceIntegration.calculateMIT(userId);
  }

  @Post('user/:userId/prioritize')
  @ApiOperation({ summary: 'Prioritize tasks' })
  async prioritizeTasks(@Param('userId') userId: string) {
    return await this.serviceIntegration.prioritizeTasks(userId);
  }

  @Post('user/:userId/reschedule')
  @ApiOperation({ summary: 'Reschedule tasks' })
  async rescheduleTasks(
    @Param('userId') userId: string,
    @Body() body: { taskIds?: string[] },
  ) {
    return await this.serviceIntegration.rescheduleTasks(userId, body?.taskIds);
  }
}
