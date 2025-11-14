import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DatabaseService } from './database.service';
import { User } from './entities/user.entity';
import { Task } from './entities/task.entity';
import { UserState } from './entities/user-state.entity';
import { UserSettings } from './entities/user-settings.entity';
import { AnalyticsEvent } from './entities/analytics-event.entity';
import { WorkSession } from './entities/work-session.entity';

@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DATABASE_HOST'),
        port: configService.get('DATABASE_PORT'),
        username: configService.get('DATABASE_USER'),
        password: configService.get('DATABASE_PASSWORD'),
        database: configService.get('DATABASE_NAME'),
        entities: [User, Task, UserState, UserSettings, AnalyticsEvent, WorkSession],
        synchronize: true, // ✅ АВТОСОЗДАНИЕ ТАБЛИЦ
        logging: configService.get('DATABASE_LOGGING') === 'true',
        ssl:
          configService.get('DATABASE_SSL') === 'true'
            ? { rejectUnauthorized: false }
            : false,
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([
      User,
      Task,
      UserState,
      UserSettings,
      AnalyticsEvent,
      WorkSession,
    ]),
  ],
  providers: [DatabaseService],
  exports: [TypeOrmModule, DatabaseService],
})
export class DatabaseModule {}
