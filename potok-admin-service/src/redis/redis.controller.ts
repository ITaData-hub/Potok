import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiSecurity } from '@nestjs/swagger';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';
import { RedisService } from '../redis/redis.service';

@ApiTags('Redis API')
@Controller('api/v1/redis')
@UseGuards(ApiKeyGuard)
@ApiSecurity('api-key')
export class RedisController {
  constructor(private readonly redisService: RedisService) {}

  @Get(':key')
  @ApiOperation({ summary: 'Get value by key' })
  async get(@Param('key') key: string) {
    const value = await this.redisService.get(key);
    return { key, value };
  }

  @Post()
  @ApiOperation({ summary: 'Set key-value pair' })
  async set(@Body() body: { key: string; value: string; ttl?: number }) {
    await this.redisService.set(body.key, body.value, body.ttl);
    return { success: true };
  }

  @Delete(':key')
  @ApiOperation({ summary: 'Delete key' })
  async delete(@Param('key') key: string) {
    await this.redisService.del(key);
    return { success: true };
  }

  @Post('publish')
  @ApiOperation({ summary: 'Publish message to channel' })
  async publish(@Body() body: { channel: string; message: any }) {
    await this.redisService.publish(body.channel, body.message);
    return { success: true };
  }

  @Get('cache/:key')
  @ApiOperation({ summary: 'Get cached object' })
  async cacheGet(@Param('key') key: string) {
    const value = await this.redisService.cacheGet(key);
    return { key, value };
  }

  @Post('cache')
  @ApiOperation({ summary: 'Cache object' })
  async cacheSet(@Body() body: { key: string; value: any; ttl?: number }) {
    await this.redisService.cacheSet(body.key, body.value, body.ttl);
    return { success: true };
  }
}
