// src/modules/admin-client/admin-client.service.ts
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
    this.adminServiceUrl = this.configService.get<string>('ADMIN_SERVICE_URL') || '';
    this.apiKey = this.configService.get<string>('ADMIN_API_KEY') || '';
  }

  // ==================== Database Operations ====================


  async dbGet(entity: string, id: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.adminServiceUrl}/api/v1/db/${entity}/${id}`, {
          headers: {
            'x-api-key': this.apiKey,
            'Content-Type': 'application/json',
          },
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
      this.logger.debug(`Creating ${entity} with data:`, JSON.stringify(data));

      const response = await firstValueFrom(
        this.httpService.post(`${this.adminServiceUrl}/api/v1/db/${entity}`, data, {
          headers: {
            'x-api-key': this.apiKey,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }),
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Error creating ${entity}: ${error.message}`);
      throw error;
    }
  }

  async dbList(entity: string, filter: any = {}, limit = 100, offset = 0): Promise<any[]> {
    try {
      const params = new URLSearchParams();

      // Преобразуем все значения фильтра в строки
      Object.entries(filter || {}).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value)); // ← Преобразуем в строку
        }
      });

      params.append('limit', limit.toString());
      params.append('offset', offset.toString());

      const url = `${this.adminServiceUrl}/api/v1/db/${entity}?${params.toString()}`;

      this.logger.debug(`Requesting: ${url}`);

      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: {
            'x-api-key': this.apiKey,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }),
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Error listing ${entity}: ${error.message}`);
      throw error;
    }
  }

  async dbUpdate(entity: string, id: string, data: any): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.patch(`${this.adminServiceUrl}/api/v1/db/${entity}/${id}`, data, {
          headers: {
            'x-api-key': this.apiKey,
            'Content-Type': 'application/json',
          },
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
          headers: {
            'x-api-key': this.apiKey,
            'Content-Type': 'application/json',
          },
          timeout: 5000,
        }),
      );
    } catch (error) {
      this.logger.error(`Error deleting ${entity}/${id}: ${error.message}`);
      throw error;
    }
  }

  /**
 * Найти одну запись по фильтру
 */
  async dbFindOne(entity: string, filter: any = {}): Promise<any> {
    try {
      const results = await this.dbList(entity, filter, 1, 0);
      return results.length > 0 ? results[0] : null;
    } catch (error) {
      this.logger.error(`Error finding one ${entity}: ${error.message}`);
      return null;
    }
  }

  // ==================== Redis Operations ====================

  async redisGet(key: string): Promise<string | null> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.adminServiceUrl}/api/v1/redis/${key}`, {
          headers: {
            'x-api-key': this.apiKey,
            'Content-Type': 'application/json',
          },
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
            headers: {
              'x-api-key': this.apiKey,
              'Content-Type': 'application/json',
            },
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
          headers: {
            'x-api-key': this.apiKey,
            'Content-Type': 'application/json',
          },
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
            headers: {
              'x-api-key': this.apiKey,
              'Content-Type': 'application/json',
            },
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
          headers: {
            'x-api-key': this.apiKey,
            'Content-Type': 'application/json',
          },
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
            headers: {
              'x-api-key': this.apiKey,
              'Content-Type': 'application/json',
            },
            timeout: 3000,
          },
        ),
      );
    } catch (error) {
      this.logger.error(`Error setting cache ${key}: ${error.message}`);
    }
  }
}
