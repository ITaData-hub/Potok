import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AdminClientModule } from './modules/admin-client/admin-client.module';
import { AuthModule } from './modules/auth/auth.module';
import { BotModule } from './modules/bot/bot.module';
import { GatewayModule } from './modules/gateway/gateway.module';
import { WebsocketModule } from './modules/websocket/websocket.module';
import { HealthModule } from './modules/health/health.module';
import { WebhookModule } from './modules/webhook/webhook.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),
    AdminClientModule,
    AuthModule,
    BotModule,
    GatewayModule,
    WebsocketModule,
    HealthModule,
    WebhookModule
  ],
})
export class AppModule {}
