import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MicroserviceProxyService } from './microservice-proxy.service';

@Injectable()
export class GatewayService {
  private readonly logger = new Logger(GatewayService.name);
  private cache: Map<string, { data: any; expiry: number }> = new Map();

  constructor(
    private readonly configService: ConfigService,
    private readonly proxyService: MicroserviceProxyService,
  ) {}

  async proxyToService(
    serviceName: string,
    endpoint: string,
    method: string,
    body?: any,
    headers?: Record<string, string>,
  ): Promise<any> {
    const cacheKey = `${serviceName}:${method}:${endpoint}`;
    
    if (method === 'GET') {
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        this.logger.debug(`Cache HIT: ${cacheKey}`);
        return cached;
      }
    }

    const result = await this.proxyService.proxyRequest(
      serviceName,
      endpoint,
      method,
      body,
      headers,
    );

    if (method === 'GET') {
      this.setCache(cacheKey, result, 300);
    }

    return result;
  }

  // ДОБАВЛЕНО: aggregateData метод
  async aggregateData(userId: string): Promise<any> {
    return this.aggregateDashboard(userId);
  }

  async aggregateDashboard(userId: string): Promise<any> {
    try {
      const [currentState, tasks, mitRecommendation] = await Promise.all([
        this.proxyToService('state', `/api/v1/state/user/${userId}/current`, 'GET'),
        this.proxyToService('task', `/api/v1/distribution/user/${userId}/tasks`, 'GET'),
        this.proxyToService('task', `/api/v1/distribution/user/${userId}/mit`, 'GET'),
      ]);

      return {
        state: currentState,
        tasks: tasks,
        mit: mitRecommendation,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error(`Dashboard aggregation failed for user ${userId}:`, error);
      throw new HttpException(
        'Failed to aggregate dashboard data',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  // ДОБАВЛЕНО: invalidateCache метод
  async invalidateCache(service: string, pattern: string): Promise<void> {
    const prefix = `${service}:`;
    const keysToDelete: string[] = [];
    
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix) && key.includes(pattern)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
    this.logger.log(`Invalidated ${keysToDelete.length} cache entries for ${service}:${pattern}`);
  }

  // ДОБАВЛЕНО: executeParallel метод
  async executeParallel(requests: Array<{ service: string; endpoint: string; method: string; body?: any }>): Promise<any[]> {
    const promises = requests.map(req =>
      this.proxyToService(req.service, req.endpoint, req.method, req.body)
        .catch(error => {
          this.logger.error(`Parallel request failed: ${req.service}${req.endpoint}`, error);
          return { error: error.message, service: req.service, endpoint: req.endpoint };
        })
    );
    
    return Promise.all(promises);
  }

  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) {
      return null;
    }

    if (Date.now() > cached.expiry) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  private setCache(key: string, data: any, ttlSeconds: number): void {
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttlSeconds * 1000,
    });
  }

  cleanExpiredCache(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now > value.expiry) {
        this.cache.delete(key);
      }
    }
  }
}
