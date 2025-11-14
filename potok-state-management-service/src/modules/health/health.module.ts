import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 3000,
      maxRedirects: 2,
    }),
  ],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
