import { Controller, Get, Header } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { Public } from '../../common/decorators/public.decorator';

@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  /**
   * Prometheus metrics endpoint
   * GET /api/v1/metrics
   */
  @Get()
  @Public()
  @Header('Content-Type', 'text/plain')
  async getMetrics() {
    return await this.metricsService.getMetrics();
  }
}
