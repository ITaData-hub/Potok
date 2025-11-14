import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class GatewayProxyService {
  private readonly logger = new Logger(GatewayProxyService.name);
  private readonly serviceUrls: Map<string, string> = new Map();
  private readonly apiKeys: Map<string, string> = new Map();

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.serviceUrls.set(
      'admin',
      this.configService.get<string>('services.admin.url') || 'http://localhost:3000',
    );
    this.serviceUrls.set(
      'state',
      this.configService.get<string>('services.state.url') || 'http://localhost:3002',
    );
    this.serviceUrls.set(
      'task',
      this.configService.get<string>('services.task.url') || 'http://localhost:3003',
    );

    // Загрузка API-ключей
    this.apiKeys.set('admin', this.configService.get<string>('ADMIN_API_KEY') || '');
    this.apiKeys.set('state', this.configService.get<string>('STATE_API_KEY') || '');
    this.apiKeys.set('task', this.configService.get<string>('TASK_API_KEY') || '');
  }

  async proxyToService(
    serviceName: string,
    path: string,
    method: string,
    data?: any,
  ): Promise<any> {
    const serviceUrl = this.serviceUrls.get(serviceName);
    if (!serviceUrl) {
      throw new Error(`Service ${serviceName} not found`);
    }

    const url = `${serviceUrl}${path}`;
    const apiKey = this.apiKeys.get(serviceName);
    
    // Добавляем заголовок с API-ключом
    const headers = {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
    };
    
    try {
      let response;

      switch (method.toUpperCase()) {
        case 'GET':
          response = await firstValueFrom(
            this.httpService.get(url, { headers, timeout: 5000 }),
          );
          break;

        case 'POST':
          response = await firstValueFrom(
            this.httpService.post(url, data, { headers, timeout: 5000 }),
          );
          break;

        case 'PATCH':
          response = await firstValueFrom(
            this.httpService.patch(url, data, { headers, timeout: 5000 }),
          );
          break;

        default:
          throw new Error(`Unsupported method: ${method}`);
      }

      return response.data;
    } catch (error) {
      this.logger.error(`Error proxying to ${serviceName}: ${error.message}`);
      throw error;
    }
  }
}
