import * as winston from 'winston';
import { TransformableInfo } from 'logform';

interface CustomTransformableInfo extends TransformableInfo {
  timestamp?: string;
  context?: string;
  trace?: string;
}

export const winstonConfig = {
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.colorize(),
        winston.format.printf((info: CustomTransformableInfo) => {
          const { timestamp, level, message, context, trace, ...meta } = info;
          let log = `${timestamp || ''} [${level}] ${context ? `[${context}]` : ''} ${message}`;
          if (trace) {
            log += `\n${trace}`;
          }
          const metaKeys = Object.keys(meta).filter(
            (key) => !['level', 'message', 'timestamp', 'context', 'trace'].includes(key),
          );
          if (metaKeys.length > 0) {
            const filteredMeta = metaKeys.reduce((acc, key) => {
              acc[key] = meta[key];
              return acc;
            }, {} as Record<string, any>);
            log += `\n${JSON.stringify(filteredMeta, null, 2)}`;
          }
          return log;
        }),
      ),
    }),
  ],
};
