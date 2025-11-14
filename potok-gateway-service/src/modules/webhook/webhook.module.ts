import { Module } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { WebsocketModule } from '../websocket/websocket.module';
import { BotModule } from '../bot/bot.module';
import { AdminClientModule } from '../admin-client/admin-client.module';
import { WebsocketService } from '../websocket/websocket.service';
import { ServiceIntegration } from '../bot/services/service-integration.service';
import { StressReliefHandler } from '../bot/handlers/stress-relief.handler';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { HttpModule } from '@nestjs/axios';
import { MessageSender } from '../bot/services/message-sender.service';
import { ScreenManager } from '../bot/services/screen-manager.service';
import { JwtService } from '@nestjs/jwt';
import { UserManager } from '../bot/services/user-manager.service';

@Module({
  imports: [
    WebsocketModule,
    BotModule,
    AdminClientModule,
    HttpModule
  ],
  controllers: [WebhookController],
  providers: [WebhookService, WebsocketService, ServiceIntegration, StressReliefHandler, WebsocketGateway, MessageSender, ScreenManager, JwtService, UserManager],
  exports: [WebhookService],
})
export class WebhookModule {}
