import { Injectable } from '@nestjs/common';
import { register, Counter, Histogram, Gauge } from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly httpRequestsTotal: Counter;
  private readonly httpRequestDuration: Histogram;
  private readonly activeConnections: Gauge;

  constructor() {
    // HTTP запросы
    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status'],
    });

    // Длительность запросов
    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route'],
      buckets: [0.1, 0.5, 1, 2, 5],
    });

    // Активные подключения
    this.activeConnections = new Gauge({
      name: 'active_connections',
      help: 'Number of active WebSocket connections',
    });
  }

  /**
   * Инкремент счетчика HTTP запросов
   */
  incrementHttpRequests(method: string, route: string, status: number) {
    this.httpRequestsTotal.inc({ method, route, status: status.toString() });
  }

  /**
   * Запись длительности HTTP запроса
   */
  observeHttpDuration(method: string, route: string, duration: number) {
    this.httpRequestDuration.observe({ method, route }, duration);
  }

  /**
   * Установить количество активных подключений
   */
  setActiveConnections(count: number) {
    this.activeConnections.set(count);
  }

  /**
   * Получить метрики в формате Prometheus
   */
  async getMetrics(): Promise<string> {
    return await register.metrics();
  }

  /**
 * Все метрики
 */
  async getAllMetrics(): Promise<any> {
    return {
      http: await this.getMetrics(),
      system: this.getSystemMetrics(),
      application: this.getApplicationMetrics(),
    };
  }

  /**
   * Системные метрики
   */
  getSystemMetrics(): any {
    return {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
    };
  }

  /**
   * Метрики приложения
   */
  getApplicationMetrics(): any {
    return {
      activeRequests: this.activeConnections['hashMap']?.['active_connections'] || 0,
    };
  }

  /**
   * Метрики задач
   */
  getTaskMetrics(): any {
    return {
      total: 0, // TODO: Получать из Task Service
      completed: 0,
      pending: 0,
    };
  }

  /**
   * Метрики кеша
   */
  getCacheMetrics(): any {
    return {
      hits: 0, // TODO: Трекинг cache hits
      misses: 0,
      hitRate: 0,
    };
  }

  /**
   * Prometheus метрики
   */
  async getPrometheusMetrics(): Promise<string> {
    return await this.getMetrics();
  }

  /**
   * Сброс метрик
   */
  resetMetrics(): void {
    register.clear();
  }

  /**
   * Инкремент счетчика запросов
   */
  incrementRequestCount(): void {
    this.httpRequestsTotal.inc();
  }

  /**
   * Инкремент активных запросов
   */
  incrementActiveRequests(): void {
    this.activeConnections.inc();
  }

  /**
   * Декремент активных запросов
   */
  decrementActiveRequests(): void {
    this.activeConnections.dec();
  }

  /**
   * Запись времени ответа
   */
  recordResponseTime(duration: number): void {
    this.httpRequestDuration.observe(duration / 1000);
  }

  /**
   * Инкремент failed запросов
   */
  incrementFailedRequestCount(): void {
    this.httpRequestsTotal.inc({ status: 'failed' });
  }
}
