// src/modules/monitoring/metrics.interceptor.ts
import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
  } from '@nestjs/common';
  import { Observable, throwError } from 'rxjs';
  import { tap, catchError } from 'rxjs/operators';
  import { MetricsService } from './metrics.service';
  
  @Injectable()
  export class MetricsInterceptor implements NestInterceptor {
    constructor(private readonly metricsService: MetricsService) {}
  
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
      const now = Date.now();
      
      // Увеличиваем счетчик активных запросов
      this.metricsService.incrementRequestCount();
      this.metricsService.incrementActiveRequests();
  
      return next.handle().pipe(
        tap(() => {
          // Успешный запрос
          const responseTime = Date.now() - now;
          this.metricsService.recordResponseTime(responseTime);
          this.metricsService.decrementActiveRequests();
        }),
        catchError((error) => {
          // Неудачный запрос
          const responseTime = Date.now() - now;
          this.metricsService.recordResponseTime(responseTime);
          this.metricsService.incrementFailedRequestCount();
          this.metricsService.decrementActiveRequests();
          return throwError(() => error);
        }),
      );
    }
  }
  