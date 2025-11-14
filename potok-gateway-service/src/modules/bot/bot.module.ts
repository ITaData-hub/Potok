import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { BotController } from './bot.controller';
import { BotService } from './bot.service';
import { CommandHandler } from './handlers/command.handler';
import { OnboardingHandler } from './handlers/onboarding.handler';
import { TaskHandler } from './handlers/task.handler';
import { TestHandler } from './handlers/test.handler';
import { MitHandler } from './handlers/mit.handler';
import { StatsHandler } from './handlers/stats.handler';
import { SettingsHandler } from './handlers/settings.handler';
import { MessageSender } from './services/message-sender.service';
import { UserManager } from './services/user-manager.service';
import { ServiceIntegration } from './services/service-integration.service';
import { AdminClientModule } from '../admin-client/admin-client.module';
import { MaxWebhookGuard } from '../auth/guards/max-webhook.guard';
import { AuthService } from '../auth/auth.service';
import { JwtService } from '@nestjs/jwt';
import { MlServiceClient } from './services/ml-service-client.service';
import { MlTaskGenerationHandler } from './handlers/ml-task-generation.handler';
import { WebsocketModule } from '../websocket/websocket.module';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { ScreenManager } from './services/screen-manager.service';
import { PomodoroService } from './services/pomodoro.service';
import { PomodoroHandler } from './handlers/pomodoro.handler';
import { StressReliefHandler } from './handlers/stress-relief.handler';
import { UIAdapterService } from './services/ui-adapter.service';
import { HelpHandler } from './handlers/help.handler';

@Module({
  imports: [
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 3,
    }),
    AdminClientModule,
    WebsocketModule
  ],
  controllers: [BotController],
  providers: [
    BotService,
    CommandHandler,
    OnboardingHandler,
    TaskHandler,
    MlTaskGenerationHandler,
    TestHandler,
    MitHandler,
    StatsHandler,
    SettingsHandler,
    MessageSender,
    UserManager,
    ServiceIntegration,
    MaxWebhookGuard,
    AuthService,
    JwtService,
    MlServiceClient,
    WebsocketGateway,
    ScreenManager,
    PomodoroService,
    PomodoroHandler,
    StressReliefHandler,
    UIAdapterService,
    HelpHandler,
  ],
  exports: [BotService],
})
export class BotModule {}
