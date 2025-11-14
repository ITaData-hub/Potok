import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { MonitoringService } from './monitoring.service';

@ApiTags('Monitoring')
@Controller('monitoring')
export class MonitoringController {
  constructor(private readonly monitoringService: MonitoringService) {}

  @Get('health')
  @ApiOperation({ summary: 'Health check' })
  async health() {
    return this.monitoringService.checkHealth();
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Получить метрики сервиса' })
  async metrics() {
    return this.monitoringService.getMetrics();
  }

  @Get('status')
  @ApiOperation({ summary: 'Статус всех компонентов' })
  async status() {
    return this.monitoringService.getDetailedStatus();
  }
}
