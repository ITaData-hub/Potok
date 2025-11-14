import { ConsoleLogger } from '@nestjs/common';
import * as winston from 'winston';

export const createWinstonLogger = (context: string) => {
  return winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.splat(),
      winston.format.json(),
    ),
    defaultMeta: { 
      service: 'admin-service', 
      context,
      environment: process.env.NODE_ENV || 'development'
    },
    transports: [
      // Console transport
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
            return `${timestamp} [${context}] ${level}: ${message} ${
              Object.keys(meta).length ? JSON.stringify(meta) : ''
            }`;
          }),
        ),
      }),
      // Error file transport
      new winston.transports.File({ 
        filename: 'logs/error.log', 
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      }),
      // Combined file transport
      new winston.transports.File({ 
        filename: 'logs/combined.log',
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      }),
    ],
  });
};

// Используем ConsoleLogger вместо Logger для NestJS v9+
export class CustomLogger extends ConsoleLogger {
  private winstonLogger: winston.Logger;

  constructor(context: string) {
    super(context);
    this.winstonLogger = createWinstonLogger(context);
  }

  log(message: string, context?: string) {
    super.log(message, context);
    this.winstonLogger.info(message, { context: context || this.context });
  }

  error(message: string, trace?: string, context?: string) {
    super.error(message, trace, context);
    this.winstonLogger.error(message, { 
      trace, 
      context: context || this.context 
    });
  }

  warn(message: string, context?: string) {
    super.warn(message, context);
    this.winstonLogger.warn(message, { context: context || this.context });
  }

  debug(message: string, context?: string) {
    super.debug(message, context);
    this.winstonLogger.debug(message, { context: context || this.context });
  }

  verbose(message: string, context?: string) {
    super.verbose(message, context);
    this.winstonLogger.verbose(message, { context: context || this.context });
  }
}
