import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/typeorm';
import { Connection } from 'typeorm';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class MonitoringService {
  constructor(
    @InjectConnection() private connection: Connection,
    private redisService: RedisService,
  ) {}

  async checkHealth() {
    const dbHealth = await this.checkDatabase();
    const redisHealth = await this.checkRedis();

    const status = dbHealth && redisHealth ? 'healthy' : 'unhealthy';

    return {
      status,
      timestamp: new Date().toISOString(),
      checks: {
        database: dbHealth ? 'up' : 'down',
        redis: redisHealth ? 'up' : 'down',
      },
    };
  }

  async getMetrics() {
    const [dbMetrics, redisMetrics] = await Promise.all([
      this.getDatabaseMetrics(),
      this.getRedisMetrics(),
    ]);

    return {
      timestamp: new Date().toISOString(),
      database: dbMetrics,
      redis: redisMetrics,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };
  }

  async getDetailedStatus() {
    const health = await this.checkHealth();
    const metrics = await this.getMetrics();

    return {
      service: 'admin-service',
      version: '1.0.0',
      ...health,
      ...metrics,
    };
  }

  private async checkDatabase(): Promise<boolean> {
    try {
      await this.connection.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  private async checkRedis(): Promise<boolean> {
    try {
      await this.redisService.set('health-check', 'ok', 10);
      return true;
    } catch {
      return false;
    }
  }

  private async getDatabaseMetrics() {
    try {
      const result = await this.connection.query(`
        SELECT 
          count(*) as active_connections,
          max_conn as max_connections
        FROM pg_stat_activity, 
        (SELECT setting::int AS max_conn FROM pg_settings WHERE name = 'max_connections') AS mc
        WHERE state = 'active'
        GROUP BY max_conn
      `);

      return {
        active_connections: result[0]?.active_connections || 0,
        max_connections: result[0]?.max_connections || 0,
      };
    } catch {
      return { error: 'Unable to fetch DB metrics' };
    }
  }

  private async getRedisMetrics() {
    try {
      const info = await this.redisService['client'].info();
      const lines = info.split('\r\n');
      const stats: any = {};

      lines.forEach(line => {
        const [key, value] = line.split(':');
        if (key && value) stats[key] = value;
      });

      return {
        used_memory: stats.used_memory_human,
        connected_clients: parseInt(stats.connected_clients, 10),
        total_commands_processed: parseInt(stats.total_commands_processed, 10),
      };
    } catch {
      return { error: 'Unable to fetch Redis metrics' };
    }
  }
}
