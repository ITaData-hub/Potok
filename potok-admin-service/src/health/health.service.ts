import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { RedisService } from 'src/redis/redis.service';
import { DataSource } from 'typeorm';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly redisService: RedisService,
  ) {}

  async check() {
    const postgres = await this.checkPostgres();
    const redis = await this.checkRedis();

    const status = postgres && redis ? 'healthy' : 'unhealthy';

    return {
      status,
      service: 'admin-service',
      timestamp: new Date().toISOString(),
      dependencies: {
        postgres: postgres ? 'up' : 'down',
        redis: redis ? 'up' : 'down',
      },
    };
  }

  async ready() {
    const postgres = await this.checkPostgres();
    const redis = await this.checkRedis();

    if (postgres && redis) {
      return { status: 'ready' };
    }

    throw new Error('Service not ready');
  }

  private async checkPostgres(): Promise<boolean> {
    try {
      await this.dataSource.query('SELECT 1');
      return true;
    } catch (error) {
      this.logger.error(`Postgres check failed: ${error.message}`);
      return false;
    }
  }

  private async checkRedis(): Promise<boolean> {
    try {
      await this.redisService.set('health:check', 'ok', 10);
      const value = await this.redisService.get('health:check');
      return value === 'ok';
    } catch (error) {
      this.logger.error(`Redis check failed: ${error.message}`);
      return false;
    }
  }
}
