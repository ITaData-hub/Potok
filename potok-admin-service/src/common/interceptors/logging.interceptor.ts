import { Injectable, NestInterceptor, ExecutionContext, CallHandler, ConsoleLogger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new ConsoleLogger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, ip } = request;
    const userAgent = request.get('user-agent') || '';
    const startTime = Date.now();

    this.logger.log(`→ ${method} ${url} - ${ip} ${userAgent}`);

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse();
          const { statusCode } = response;
          const responseTime = Date.now() - startTime;
          
          this.logger.log(
            `← ${method} ${url} ${statusCode} - ${responseTime}ms`
          );
        },
        error: (error) => {
          const responseTime = Date.now() - startTime;
          this.logger.error(
            `← ${method} ${url} ${error.status || 500} - ${responseTime}ms - ${error.message}`
          );
        },
      }),
    );
  }
}
