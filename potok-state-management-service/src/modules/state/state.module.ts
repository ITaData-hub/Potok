import { Module } from '@nestjs/common';
import { StateController } from './state.controller';
import { StateService } from './state.service';
import { CircadianService } from './services/circadian.service';
import { UiModeService } from './services/ui-mode.service';
import { AdminClientModule } from '../admin-client/admin-client.module';
import { WebhookModule } from '../webhook/webhook.module';

@Module({
  imports: [AdminClientModule, WebhookModule],
  controllers: [StateController],
  providers: [
    StateService,
    CircadianService,
    UiModeService,
  ],
  exports: [
    StateService,
    CircadianService,
    UiModeService,
  ],
})
export class StateModule {}
