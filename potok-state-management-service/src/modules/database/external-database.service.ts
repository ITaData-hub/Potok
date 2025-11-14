import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class ExternalDatabaseService {
  private readonly logger = new Logger(ExternalDatabaseService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
  ) {
    this.baseUrl = this.configService.get<string>('database.url') || '';
    this.apiKey = this.configService.get<string>('database.apiKey') || '';
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/health`, {
          headers: {
            'X-API-Key': this.apiKey,
          },
          timeout: 3000,
        }),
      );
      return response.status === 200;
    } catch (error) {
      this.logger.error(`Health check failed: ${error.message}`);
      return false;
    }
  }

  async saveUserState(data: any): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/api/v1/db/user-states`, data, {
          headers: {
            'X-API-Key': this.apiKey,
            'Content-Type': 'application/json',
          },
        }),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to save user state: ${error.message}`);
      throw error;
    }
  }

  async getUserStateHistory(
    userId: string,
    testType?: string,
    limit: number = 7,
  ): Promise<any[]> {
    try {
      const filter: Record<string, string> = { user_id: userId };
      if (testType) {
        filter['test_type'] = testType;
      }

      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/api/v1/db/user-states`, {
          params: {
            filter: JSON.stringify(filter),
            limit,
            sort: JSON.stringify({ test_date: -1 }),
          },
          headers: {
            'X-API-Key': this.apiKey,
          },
        }),
      );
      return response.data;
    } catch (error) {
      this.logger.error(
        `Failed to get user state history: ${error.message}`,
      );
      return [];
    }
  }

  async getLatestUserState(userId: string, testType: string): Promise<any> {
    try {
      const history = await this.getUserStateHistory(userId, testType, 1);
      return history.length > 0 ? history[0] : null;
    } catch (error) {
      this.logger.error(`Failed to get latest user state: ${error.message}`);
      return null;
    }
  }
}
