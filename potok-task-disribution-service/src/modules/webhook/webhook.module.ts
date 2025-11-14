import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { WebhookService } from './webhook.service';
@Module({
  imports: [ConfigModule, HttpModule],
  providers: [WebhookService],
  exports: [WebhookService],
})
export class WebhookModule {}
