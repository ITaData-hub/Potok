import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, correlationId } = request;
    const startTime = Date.now();

    this.logger.log({
      message: 'Incoming request',
      method,
      url,
      correlationId,
    });

    return next.handle().pipe(
      tap(() => {
        const responseTime = Date.now() - startTime;
        this.logger.log({
          message: 'Request completed',
          method,
          url,
          responseTime: `${responseTime}ms`,
          correlationId,
        });
      }),
    );
  }
}
