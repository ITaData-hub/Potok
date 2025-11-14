import { registerAs } from '@nestjs/config';
import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, context, trace, correlationId, ...metadata }) => {
    let msg = `${timestamp} [${level.toUpperCase()}] [${context || 'Application'}]`;
    
    if (correlationId) {
      msg += ` [${correlationId}]`;
    }
    
    msg += `: ${message}`;
    
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata)}`;
    }
    
    if (trace) {
      msg += `\n${trace}`;
    }
    
    return msg;
  }),
);

export default registerAs('logger', () => ({
  transports: [
    // Консоль
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        customFormat,
      ),
      level: process.env.LOG_LEVEL || 'info',
    }),
    
    // Файл для всех логов
    new DailyRotateFile({
      filename: 'logs/application-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      format: customFormat,
      level: 'info',
    }),
    
    // Файл только для ошибок
    new DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d',
      format: customFormat,
      level: 'error',
    }),
  ],
  exitOnError: false,
}));
