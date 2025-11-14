import { Controller, Get } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';

@Controller('health')
export class HealthController {
  /**
   * Health check endpoint
   * GET /api/v1/health
   */
  @Get()
  @Public()
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'potok-gateway-service',
      uptime: process.uptime(),
    };
  }

  /**
   * Readiness check
   * GET /api/v1/health/ready
   */
  @Get('ready')
  @Public()
  ready() {
    return {
      status: 'ready',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Liveness check
   * GET /api/v1/health/live
   */
  @Get('live')
  @Public()
  live() {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
    };
  }
}
