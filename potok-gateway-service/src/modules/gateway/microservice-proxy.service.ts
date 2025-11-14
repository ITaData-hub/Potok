import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class MicroserviceProxyService {
  private readonly logger = new Logger(MicroserviceProxyService.name);
  private readonly serviceUrls: Map<string, string> = new Map();

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
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
  }

  /**
   * Проксирование HTTP запроса к микросервису
   */
  async proxyRequest(
    serviceName: string,
    path: string,
    method: string,
    data?: any,
    headers?: any,
  ): Promise<any> {
    const serviceUrl = this.serviceUrls.get(serviceName);
    if (!serviceUrl) {
      throw new Error(`Service ${serviceName} not found`);
    }

    const url = `${serviceUrl}${path}`;
    const timeout = this.configService.get<number>(
      `services.${serviceName}.timeout`,
      5000,
    );

    this.logger.debug(
      `Проксирование ${method} ${url} к сервису ${serviceName}`,
    );

    try {
      let response;

      switch (method.toUpperCase()) {
        case 'GET':
          response = await firstValueFrom(
            this.httpService.get(url, {
              headers,
              timeout,
            }),
          );
          break;

        case 'POST':
          response = await firstValueFrom(
            this.httpService.post(url, data, {
              headers,
              timeout,
            }),
          );
          break;

        case 'PUT':
          response = await firstValueFrom(
            this.httpService.put(url, data, {
              headers,
              timeout,
            }),
          );
          break;

        case 'PATCH':
          response = await firstValueFrom(
            this.httpService.patch(url, data, {
              headers,
              timeout,
            }),
          );
          break;

        case 'DELETE':
          response = await firstValueFrom(
            this.httpService.delete(url, {
              headers,
              timeout,
            }),
          );
          break;

        default:
          throw new Error(`Unsupported HTTP method: ${method}`);
      }

      return response.data;
    } catch (error) {
      this.logger.error(
        `Ошибка проксирования к ${serviceName}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
