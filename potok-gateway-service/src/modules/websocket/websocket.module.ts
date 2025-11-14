import { Module } from '@nestjs/common';
import { BotWebsocketGateway } from './bot-websocket.gateway';
import { WebsocketGateway } from './websocket.gateway';
import { WebsocketService } from './websocket.service';
import { JwtService } from '@nestjs/jwt';

@Module({
  imports: [],
  providers: [BotWebsocketGateway, WebsocketService, WebsocketGateway, JwtService],
  exports: [
    BotWebsocketGateway,
    WebsocketService,
     // ДОБАВИТЬ - экспортировать WebsocketService
  ],
})
export class WebsocketModule {}
