import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { AnalyticsEvent } from '../database/entities/analytics-event.entity';
import { UserState } from '../database/entities/user-state.entity';
import { Task } from '../database/entities/task.entity';
import { WorkSession } from '../database/entities/work-session.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AnalyticsEvent,
      UserState,
      Task,
      WorkSession,
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
