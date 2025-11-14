import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { NotificationsService } from './notifications.service';
import { NotificationsSchedulerService } from './notifications-scheduler.service'; // ДОБАВИТЬ
import { AdminClientModule } from '../admin-client/admin-client.module';

@Module({
  imports: [
    HttpModule, // ДОБАВИТЬ
    AdminClientModule,
  ],
  providers: [
    NotificationsService,
    NotificationsSchedulerService, // ДОБАВИТЬ
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
