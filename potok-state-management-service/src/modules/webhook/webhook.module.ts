import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { WebhookSenderService } from './webhook-sender.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 2,
    }),
  ],
  providers: [WebhookSenderService],
  exports: [WebhookSenderService],
})
export class WebhookModule {}
