import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';

@ApiTags('Analytics')
@Controller('api/v1/analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('user/:userId/summary')
  @ApiOperation({ summary: 'Get user analytics summary' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiQuery({ name: 'period', required: false, enum: ['day', 'week', 'month'] })
  async getUserSummary(
    @Param('userId') userId: string,
    @Query('period') period?: string,
  ) {
    // ИСПРАВЛЕНО: Приводим тип и валидируем
    const validPeriod = this.validatePeriod(period);
    return await this.analyticsService.getUserSummary(userId, validPeriod);
  }

  @Get('user/:userId/patterns')
  @ApiOperation({ summary: 'Get user productivity patterns' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  async getUserPatterns(@Param('userId') userId: string) {
    return await this.analyticsService.getUserPatterns(userId);
  }

  @Get('user/:userId/tasks-analytics')
  @ApiOperation({ summary: 'Get tasks analytics for user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  async getTasksAnalytics(@Param('userId') userId: string) {
    return await this.analyticsService.getTasksAnalytics(userId);
  }

  // ИСПРАВЛЕНО: Убираем метод trackEvent если он не нужен
  // Или добавляем его в service

  /**
   * Валидация периода
   */
  private validatePeriod(period?: string): 'day' | 'week' | 'month' {
    if (period === 'day' || period === 'week' || period === 'month') {
      return period;
    }
    return 'week'; // По умолчанию
  }
}
