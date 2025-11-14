import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../database/entities/user.entity';
import { Task } from '../database/entities/task.entity';
import { UserState } from '../database/entities/user-state.entity';
import { UserSettings } from '../database/entities/user-settings.entity';
import { AnalyticsEvent } from '../database/entities/analytics-event.entity';
import { WorkSession } from '../database/entities/work-session.entity';
import { RedisModule } from '../redis/redis.module';
import { DatabaseController } from 'src/database/database.controller';
import { RedisController } from 'src/redis/redis.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Task,
      UserState,
      UserSettings,
      AnalyticsEvent,
      WorkSession,
    ]),
    RedisModule,
  ],
  controllers: [DatabaseController, RedisController],
  exports: [],
})
export class ApiModule {}
