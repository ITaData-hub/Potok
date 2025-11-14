import { ConfigService } from '@nestjs/config';
import * as winston from 'winston';

export const createLogger = (configService: ConfigService) => {
  const logLevel = configService.get('logger.level') || 'info';
  const logFormat = configService.get('logger.format') || 'json';

  const formats = [
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
  ];

  if (logFormat === 'pretty') {
    formats.push(
      winston.format.colorize(),
      winston.format.printf(({ timestamp, level, message, context, trace, ...meta }) => {
        let log = `${timestamp} [${context || 'Application'}] ${level}: ${message}`;
        
        if (Object.keys(meta).length > 0) {
          log += ` ${JSON.stringify(meta)}`;
        }
        
        if (trace) {
          log += `\n${trace}`;
        }
        
        return log;
      }),
    );
  } else {
    formats.push(winston.format.json());
  }

  return {
    level: logLevel,
    format: winston.format.combine(...formats),
    transports: [
      new winston.transports.Console({
        handleExceptions: true,
      }),
      new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      }),
      new winston.transports.File({
        filename: 'logs/combined.log',
        maxsize: 5242880,
        maxFiles: 5,
      }),
    ],
    exitOnError: false,
  };
};
