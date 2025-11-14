import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { HealthService } from './health.service';

@ApiTags('Health')
@Controller('api/v1/health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Health check' })
  async check() {
    return await this.healthService.check();
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness check' })
  async ready() {
    return await this.healthService.ready();
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness check' })
  async live() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
