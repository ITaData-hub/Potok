import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class RequestAggregatorService {
  private readonly logger = new Logger(RequestAggregatorService.name);

  /**
   * Агрегация множественных запросов
   */
  async aggregate(requests: Array<() => Promise<any>>): Promise<any[]> {
    try {
      return await Promise.all(requests.map((request) => request()));
    } catch (error) {
      this.logger.error(`Aggregation failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Выполнение с fallback значениями при ошибках
   */
  async executeWithFallback<T>(
    requests: Array<() => Promise<T>>,
    fallbackValue: T | null = null,
  ): Promise<Array<T | null>> {
    return Promise.all(
      requests.map(async (request) => {
        try {
          return await request();
        } catch (error) {
          this.logger.warn(`Request failed, using fallback: ${error.message}`);
          return fallbackValue;
        }
      }),
    );
  }

  /**
   * Выполнение с таймаутом
   */
  async executeWithTimeout<T>(
    request: () => Promise<T>,
    timeoutMs: number,
  ): Promise<T> {
    return Promise.race([
      request(),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), timeoutMs),
      ),
    ]);
  }

  /**
   * Последовательное выполнение запросов
   */
  async executeSequentially<T>(
    requests: Array<() => Promise<T>>,
  ): Promise<T[]> {
    const results: T[] = [];
    for (const request of requests) {
      results.push(await request());
    }
    return results;
  }
}