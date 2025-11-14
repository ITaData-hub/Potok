import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis;
  private subscriber: Redis;
  private publisher: Redis;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const config = {
      host: this.configService.get('REDIS_HOST'),
      port: this.configService.get('REDIS_PORT'),
      password: this.configService.get('REDIS_PASSWORD') || undefined,
      db: this.configService.get('REDIS_DB') || 0,
      keyPrefix: this.configService.get('REDIS_KEY_PREFIX') || 'potok:',
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    };

    this.client = new Redis(config);
    this.subscriber = new Redis(config);
    this.publisher = new Redis(config);

    this.client.on('connect', () => this.logger.log('Redis client connected'));
    this.client.on('error', (err) => this.logger.error('Redis client error', err));

    this.subscriber.on('connect', () => this.logger.log('Redis subscriber connected'));
    this.publisher.on('connect', () => this.logger.log('Redis publisher connected'));
  }

  async onModuleDestroy() {
    await this.client.quit();
    await this.subscriber.quit();
    await this.publisher.quit();
  }

  // ==================== Basic Operations ====================

  async get(key: string): Promise<string | null> {
    return await this.client.get(key);
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await this.client.setex(key, ttl, value);
    } else {
      await this.client.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  async ttl(key: string): Promise<number> {
    return await this.client.ttl(key);
  }

  async expire(key: string, seconds: number): Promise<void> {
    await this.client.expire(key, seconds);
  }

  // ==================== Hash Operations ====================

  async hget(key: string, field: string): Promise<string | null> {
    return await this.client.hget(key, field);
  }

  async hset(key: string, field: string, value: string): Promise<void> {
    await this.client.hset(key, field, value);
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    return await this.client.hgetall(key);
  }

  async hdel(key: string, field: string): Promise<void> {
    await this.client.hdel(key, field);
  }

  // ==================== List Operations ====================

  async lpush(key: string, value: string): Promise<void> {
    await this.client.lpush(key, value);
  }

  async rpush(key: string, value: string): Promise<void> {
    await this.client.rpush(key, value);
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    return await this.client.lrange(key, start, stop);
  }

  // ==================== Set Operations ====================

  async sadd(key: string, member: string): Promise<void> {
    await this.client.sadd(key, member);
  }

  async smembers(key: string): Promise<string[]> {
    return await this.client.smembers(key);
  }

  async sismember(key: string, member: string): Promise<boolean> {
    const result = await this.client.sismember(key, member);
    return result === 1;
  }

  // ==================== Sorted Set Operations ====================

  async zadd(key: string, score: number, member: string): Promise<void> {
    await this.client.zadd(key, score, member);
  }

  async zrange(key: string, start: number, stop: number): Promise<string[]> {
    return await this.client.zrange(key, start, stop);
  }

  async zrevrange(key: string, start: number, stop: number): Promise<string[]> {
    return await this.client.zrevrange(key, start, stop);
  }

  // ==================== Pub/Sub ====================

  async publish(channel: string, message: any): Promise<void> {
    const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
    await this.publisher.publish(channel, messageStr);
    this.logger.debug(`Published to ${channel}: ${messageStr}`);
  }

  async subscribe(channel: string, callback: (message: any) => void): Promise<void> {
    this.subscriber.subscribe(channel, (err, count) => {
      if (err) {
        this.logger.error(`Error subscribing to ${channel}: ${err.message}`);
      } else {
        this.logger.log(`Subscribed to ${channel} (${count} total subscriptions)`);
      }
    });

    this.subscriber.on('message', (ch, message) => {
      if (ch === channel) {
        try {
          const parsed = JSON.parse(message);
          callback(parsed);
        } catch (error) {
          callback(message);
        }
      }
    });
  }

  async unsubscribe(channel: string): Promise<void> {
    await this.subscriber.unsubscribe(channel);
    this.logger.log(`Unsubscribed from ${channel}`);
  }

  // ==================== Cache Helpers ====================

  async cacheGet<T>(key: string): Promise<T | null> {
    const data = await this.get(key);
    return data ? JSON.parse(data) : null;
  }

  async cacheSet<T>(key: string, value: T, ttl?: number): Promise<void> {
    await this.set(key, JSON.stringify(value), ttl);
  }

  async cacheDel(key: string): Promise<void> {
    await this.del(key);
  }

  // ==================== Pattern Operations ====================

  async keys(pattern: string): Promise<string[]> {
    return await this.client.keys(pattern);
  }

  async deleteByPattern(pattern: string): Promise<number> {
    const keys = await this.keys(pattern);
    if (keys.length === 0) return 0;
    return await this.client.del(...keys);
  }
}
