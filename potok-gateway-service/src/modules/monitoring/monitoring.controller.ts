// src/modules/monitoring/monitoring.controller.ts
import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiOkResponse } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { HealthService } from './health.service';
import { MetricsService } from './metrics.service';

@ApiTags('monitoring')
@Controller()
export class MonitoringController {
  constructor(
    private readonly healthService: HealthService,
    private readonly metricsService: MetricsService,
  ) {}


  @Public()
  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe' })
  @ApiOkResponse({ description: 'System readiness status' })
  async getReady() {
    return this.healthService.checkReadiness();
  }


  @Get('metrics')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get application metrics' })
  @ApiOkResponse({ description: 'Application performance metrics' })
  async getMetrics() {
    return this.metricsService.getAllMetrics();
  }

  @Get('metrics/system')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get system metrics' })
  @ApiOkResponse({ description: 'System resource metrics' })
  getSystemMetrics() {
    return this.metricsService.getSystemMetrics();
  }

  @Get('metrics/application')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get application metrics' })
  @ApiOkResponse({ description: 'Application request metrics' })
  getApplicationMetrics() {
    return this.metricsService.getApplicationMetrics();
  }

  @Get('metrics/tasks')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get task metrics' })
  @ApiOkResponse({ description: 'Task processing metrics' })
  async getTaskMetrics() {
    return this.metricsService.getTaskMetrics();
  }

  @Get('metrics/cache')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get cache metrics' })
  @ApiOkResponse({ description: 'Redis cache metrics' })
  async getCacheMetrics() {
    return this.metricsService.getCacheMetrics();
  }

  @Public()
  @Get('metrics/prometheus')
  @ApiOperation({ summary: 'Get metrics in Prometheus format' })
  @ApiOkResponse({ 
    description: 'Metrics in Prometheus exposition format',
    content: {
      'text/plain': {
        schema: { type: 'string' }
      }
    }
  })
  async getPrometheusMetrics() {
    const metrics = await this.metricsService.getPrometheusMetrics();
    return metrics;
  }

  @Post('metrics/reset')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reset all metrics' })
  @ApiOkResponse({ description: 'Metrics reset successfully' })
  resetMetrics() {
    this.metricsService.resetMetrics();
    return { message: 'Metrics have been reset' };
  }
}
