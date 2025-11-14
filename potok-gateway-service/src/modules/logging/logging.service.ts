import { Injectable, LoggerService } from '@nestjs/common';
import * as winston from 'winston';

@Injectable()
export class LoggingService implements LoggerService {
  private readonly logger: winston.Logger;

  constructor() {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp({
          format: 'YYYY-MM-DD HH:mm:ss',
        }),
        winston.format.errors({ stack: true }),
        winston.format.splat(),
        winston.format.json(),
      ),
      defaultMeta: { service: 'potok-gateway' },
      transports: [
        // Console transport
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
              return `[${timestamp}] [${level}] ${context ? `[${context}]` : ''} ${message} ${
                Object.keys(meta).length ? JSON.stringify(meta) : ''
              }`;
            }),
          ),
        }),
        // File transport для ошибок
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error',
        }),
        // File transport для всех логов
        new winston.transports.File({
          filename: 'logs/combined.log',
        }),
      ],
    });
  }

  log(message: string, context?: string) {
    this.logger.info(message, { context });
  }

  error(message: string, trace?: string, context?: string) {
    this.logger.error(message, { trace, context });
  }

  warn(message: string, context?: string) {
    this.logger.warn(message, { context });
  }

  debug(message: string, context?: string) {
    this.logger.debug(message, { context });
  }

  verbose(message: string, context?: string) {
    this.logger.verbose(message, { context });
  }

  /**
   * Логирование HTTP запросов
   */
  logRequest(method: string, url: string, statusCode: number, duration: number) {
    this.logger.info('HTTP Request', {
      method,
      url,
      statusCode,
      duration: `${duration}ms`,
    });
  }

  /**
   * Логирование ошибок с дополнительным контекстом
   */
  logError(error: Error, context?: string, additionalData?: any) {
    this.logger.error(error.message, {
      context,
      stack: error.stack,
      ...additionalData,
    });
  }
}
