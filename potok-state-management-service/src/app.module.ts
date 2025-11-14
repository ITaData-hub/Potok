import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AdminClientModule } from './modules/admin-client/admin-client.module';
import { StateModule } from './modules/state/state.module';
import { TestsModule } from './modules/tests/tests.module';
import { RecommendationsModule } from './modules/recommendations/recommendations.module';
import { WebhookModule } from './modules/webhook/webhook.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    AdminClientModule,
    StateModule,
    TestsModule,
    RecommendationsModule,
    WebhookModule,
    NotificationsModule,
    HealthModule,
  ],
})
export class AppModule {}
