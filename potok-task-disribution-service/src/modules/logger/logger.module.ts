import { Module, Global } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import { ConfigService } from '@nestjs/config';
import { createLogger } from './logger.config';

@Global()
@Module({
  imports: [
    WinstonModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return createLogger(configService);
      },
    }),
  ],
  exports: [WinstonModule],
})
export class LoggerModule {}
