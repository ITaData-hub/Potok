import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class AdminClientService {
  private readonly logger = new Logger(AdminClientService.name);
  private readonly adminServiceUrl: string;
  private readonly apiKey: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.adminServiceUrl = this.configService.get<string>('ADMIN_SERVICE_URL');
    this.apiKey = this.configService.get<string>('ADMIN_API_KEY');
  }

  // ==================== Database Operations ====================

  async dbList(entity: string, query: any = {}): Promise<any[]> {
    try {
      const params = new URLSearchParams();
      Object.keys(query).forEach((key) => {
        if (query[key] !== undefined && query[key] !== null) {
          params.append(key, query[key].toString());
        }
      });
      
      const response = await firstValueFrom(
        this.httpService.get(`${this.adminServiceUrl}/api/v1/db/${entity}?${params.toString()}`, {
          headers: { 'X-API-Key': this.apiKey },
          timeout: 10000,
        }),
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Error listing ${entity}: ${error.message}`);
      throw error;
    }
  }

  async dbGet(entity: string, id: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.adminServiceUrl}/api/v1/db/${entity}/${id}`, {
          headers: { 'X-API-Key': this.apiKey },
          timeout: 5000,
        }),
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Error getting ${entity}/${id}: ${error.message}`);
      throw error;
    }
  }

  async dbCreate(entity: string, data: any): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.adminServiceUrl}/api/v1/db/${entity}`, data, {
          headers: { 'X-API-Key': this.apiKey },
          timeout: 10000,
        }),
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Error creating ${entity}: ${error.message}`);
      throw error;
    }
  }

  async dbUpdate(entity: string, id: string, data: any): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.patch(`${this.adminServiceUrl}/api/v1/db/${entity}/${id}`, data, {
          headers: { 'X-API-Key': this.apiKey },
          timeout: 10000,
        }),
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Error updating ${entity}/${id}: ${error.message}`);
      throw error;
    }
  }

  async dbDelete(entity: string, id: string): Promise<void> {
    try {
      await firstValueFrom(
        this.httpService.delete(`${this.adminServiceUrl}/api/v1/db/${entity}/${id}`, {
          headers: { 'X-API-Key': this.apiKey },
          timeout: 5000,
        }),
      );
    } catch (error) {
      this.logger.error(`Error deleting ${entity}/${id}: ${error.message}`);
      throw error;
    }
  }

  // ==================== Redis Operations ====================

  async redisGet(key: string): Promise<string | null> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.adminServiceUrl}/api/v1/redis/${key}`, {
          headers: { 'X-API-Key': this.apiKey },
          timeout: 3000,
        }),
      );

      return response.data.value;
    } catch (error) {
      this.logger.error(`Error getting Redis key ${key}: ${error.message}`);
      return null;
    }
  }

  async redisSet(key: string, value: string, ttl?: number): Promise<void> {
    try {
      await firstValueFrom(
        this.httpService.post(
          `${this.adminServiceUrl}/api/v1/redis`,
          { key, value, ttl },
          {
            headers: { 'X-API-Key': this.apiKey },
            timeout: 3000,
          },
        ),
      );
    } catch (error) {
      this.logger.error(`Error setting Redis key ${key}: ${error.message}`);
      throw error;
    }
  }

  async redisDel(key: string): Promise<void> {
    try {
      await firstValueFrom(
        this.httpService.delete(`${this.adminServiceUrl}/api/v1/redis/${key}`, {
          headers: { 'X-API-Key': this.apiKey },
          timeout: 3000,
        }),
      );
    } catch (error) {
      this.logger.error(`Error deleting Redis key ${key}: ${error.message}`);
    }
  }

  async redisPublish(channel: string, message: any): Promise<void> {
    try {
      await firstValueFrom(
        this.httpService.post(
          `${this.adminServiceUrl}/api/v1/redis/publish`,
          { channel, message },
          {
            headers: { 'X-API-Key': this.apiKey },
            timeout: 3000,
          },
        ),
      );
    } catch (error) {
      this.logger.error(`Error publishing to Redis channel ${channel}: ${error.message}`);
    }
  }

  async cacheGet<T>(key: string): Promise<T | null> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.adminServiceUrl}/api/v1/redis/cache/${key}`, {
          headers: { 'X-API-Key': this.apiKey },
          timeout: 3000,
        }),
      );

      return response.data.value;
    } catch (error) {
      this.logger.error(`Error getting cache ${key}: ${error.message}`);
      return null;
    }
  }

  async cacheSet<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      await firstValueFrom(
        this.httpService.post(
          `${this.adminServiceUrl}/api/v1/redis/cache`,
          { key, value, ttl },
          {
            headers: { 'X-API-Key': this.apiKey },
            timeout: 3000,
          },
        ),
      );
    } catch (error) {
      this.logger.error(`Error setting cache ${key}: ${error.message}`);
    }
  }
}
