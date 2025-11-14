import * as winston from 'winston';

export const winstonConfig = {
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.colorize(),
        winston.format.printf((info) => {
          const { timestamp, level, message, context, trace, ...meta } = info as any;
          let log = `${timestamp} [${level}] ${context ? `[${context}]` : ''} ${message}`;
          if (trace) {
            log += `\n${trace}`;
          }
          if (Object.keys(meta).length > 0) {
            log += `\n${JSON.stringify(meta, null, 2)}`;
          }
          return log;
        }),
      ),
    }),
  ],
};
