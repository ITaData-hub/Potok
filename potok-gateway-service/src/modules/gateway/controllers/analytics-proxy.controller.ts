import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ServiceIntegration } from '../../bot/services/service-integration.service';

@ApiTags('Gateway - Analytics Proxy')
@Controller('api/v1/gateway/analytics')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AnalyticsProxyController {
  constructor(private readonly serviceIntegration: ServiceIntegration) {}

  @Get('user/:userId/summary')
  @ApiOperation({ summary: 'Get user analytics summary' })
  @ApiQuery({ name: 'period', required: false, enum: ['day', 'week', 'month'] })
  async getSummary(
    @Param('userId') userId: string,
    @Query('period') period?: string,
  ) {
    return await this.serviceIntegration.getUserStats(userId, period || 'week');
  }

  @Get('user/:userId/patterns')
  @ApiOperation({ summary: 'Get user productivity patterns' })
  async getPatterns(@Param('userId') userId: string) {
    return await this.serviceIntegration.getUserPatterns(userId);
  }

  @Get('user/:userId/tasks-analytics')
  @ApiOperation({ summary: 'Get tasks analytics' })
  async getTasksAnalytics(@Param('userId') userId: string) {
    return await this.serviceIntegration.getTasksAnalytics(userId);
  }
}
