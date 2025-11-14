import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, IsNull, Not, MoreThanOrEqual, LessThan } from 'typeorm';
import { User } from './entities/user.entity';
import { Task } from './entities/task.entity';
import { UserState } from './entities/user-state.entity';
import { UserSettings } from './entities/user-settings.entity';
import { AnalyticsEvent } from './entities/analytics-event.entity';
import { WorkSession } from './entities/work-session.entity';

@Injectable()
export class DatabaseService {
  private readonly logger = new Logger(DatabaseService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(UserState)
    private readonly stateRepository: Repository<UserState>,
    @InjectRepository(UserSettings)
    private readonly settingsRepository: Repository<UserSettings>,
    @InjectRepository(AnalyticsEvent)
    private readonly analyticsRepository: Repository<AnalyticsEvent>,
    @InjectRepository(WorkSession)
    private readonly workSessionRepository: Repository<WorkSession>,
  ) {}

  // ==================== Users ====================

  async findUsers(query: any): Promise<User[]> {
    return await this.userRepository.find({
      where: query,
      take: query.limit || 100,
      skip: query.offset || 0,
    });
  }

  async findUserById(id: string): Promise<User | null> {
    return await this.userRepository.findOne({ where: { id } });
  }

  async findUserByMaxId(maxUserId: string): Promise<User | null> {
    return await this.userRepository.findOne({ where: { max_user_id: maxUserId } });
  }

  async createUser(data: Partial<User>): Promise<User> {
    try {
      const user = this.userRepository.create(data);
      return await this.userRepository.save(user);
    } catch (error) {
      this.logger.error(`Error creating user: ${error.message}`, error.stack);
      throw error;
    }
  }

  async updateUser(id: string, data: Partial<User>): Promise<User | null> {
    try {
      this.logger.log(`Updating user ${id} with data: ${JSON.stringify(data)}`);
      
      // Проверяем что пользователь существует
      const existing = await this.findUserById(id);
      if (!existing) {
        this.logger.error(`User not found: ${id}`);
        throw new NotFoundException(`User with id ${id} not found`);
      }

      // Получаем метаданные колонок из entity
      const metadata = this.userRepository.metadata;
      const allowedColumns = metadata.columns.map(col => col.propertyName);
      
      // Фильтруем данные - оставляем только существующие поля
      const filteredData: any = {};
      Object.keys(data).forEach(key => {
        if (allowedColumns.includes(key)) {
          filteredData[key] = data[key];
        } else {
          this.logger.warn(`⚠️ Skipping unknown field "${key}" for User entity`);
        }
      });

      this.logger.debug(`Filtered data for update: ${JSON.stringify(filteredData)}`);

      // Обновляем только с валидными полями
      if (Object.keys(filteredData).length === 0) {
        this.logger.warn(`No valid fields to update for user ${id}`);
        return existing;
      }

      await this.userRepository.update(id, filteredData);
      
      const updated = await this.findUserById(id);
      this.logger.log(`✅ Successfully updated user ${id}`);
      
      return updated;
    } catch (error) {
      this.logger.error(`❌ Error updating user ${id}: ${error.message}`, error.stack);
      
      // Детальное логирование для schema errors
      if (error.message.includes('column') || error.message.includes('does not exist')) {
        this.logger.error(`🚨 Database schema error - column may not exist in users table`);
        this.logger.error(`Attempted to update with data: ${JSON.stringify(data)}`);
      }
      
      throw error;
    }
  }

  // ==================== Tasks ====================

  async findTasks(query: any): Promise<Task[]> {
    const where: any = {};

    if (query.user_id) where.user_id = query.user_id;
    if (query.status) where.status = query.status;
    if (query.priority) where.priority = query.priority;

    return await this.taskRepository.find({
      where,
      order: { created_at: 'DESC' },
      take: query.limit || 100,
      skip: query.offset || 0,
    });
  }

  async findTaskById(id: string): Promise<Task | null> {
    return await this.taskRepository.findOne({ where: { id } });
  }

  async createTask(data: Partial<Task>): Promise<Task> {
    try {
      const task = this.taskRepository.create(data);
      return await this.taskRepository.save(task);
    } catch (error) {
      this.logger.error(`Error creating task: ${error.message}`, error.stack);
      throw error;
    }
  }

  async updateTask(id: string, data: Partial<Task>): Promise<Task | null> {
    try {
      this.logger.log(`Updating task ${id}`);
      
      const existing = await this.findTaskById(id);
      if (!existing) {
        throw new NotFoundException(`Task with id ${id} not found`);
      }

      await this.taskRepository.update(id, data);
      const updated = await this.findTaskById(id);
      
      this.logger.log(`✅ Successfully updated task ${id}`);
      return updated;
    } catch (error) {
      this.logger.error(`Error updating task ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async deleteTask(id: string): Promise<void> {
    try {
      const result = await this.taskRepository.delete(id);
      if (result.affected === 0) {
        throw new NotFoundException(`Task with id ${id} not found`);
      }
      this.logger.log(`✅ Successfully deleted task ${id}`);
    } catch (error) {
      this.logger.error(`Error deleting task ${id}: ${error.message}`);
      throw error;
    }
  }

  // ==================== User States ====================

  async findUserStates(query: any): Promise<UserState[]> {
    try {
      this.logger.log(`=== Finding User States ===`);
      this.logger.log(`Query params: ${JSON.stringify(query)}`);
      
      const where: any = {};
    
      if (query.user_id) where.user_id = query.user_id;
      if (query.test_type) where.test_type = query.test_type;
    
      // Обработка фильтров по дате
      if (query.created_at_gte && query.created_at_lt) {
        this.logger.log(`Using Between: ${query.created_at_gte} - ${query.created_at_lt}`);
        where.created_at = Between(
          new Date(query.created_at_gte),
          new Date(query.created_at_lt)
        );
      } else if (query.created_at_gte) {
        this.logger.log(`Using MoreThanOrEqual: ${query.created_at_gte}`);
        where.created_at = MoreThanOrEqual(new Date(query.created_at_gte));
      } else if (query.created_at_lt) {
        this.logger.log(`Using LessThan: ${query.created_at_lt}`);
        where.created_at = LessThan(new Date(query.created_at_lt));
      }
    
      this.logger.log(`Where clause: ${JSON.stringify(where)}`);
    
      const results = await this.stateRepository.find({
        where,
        order: { created_at: query.order === 'ASC' ? 'ASC' : 'DESC' },
        take: query.limit || 100,
        skip: query.offset || 0,
      });
    
      this.logger.log(`Found ${results.length} records`);
      
      // ДОБАВИТЬ: Логировать каждую запись
      if (results.length > 0) {
        results.forEach((r, idx) => {
          this.logger.debug(`  [${idx}] test_type: ${r.test_type}, created_at: ${r.created_at}`);
        });
      }
      
      // КРИТИЧНО: Всегда возвращать массив, даже пустой
      return results || [];
    } catch (error) {
      this.logger.error(`Error finding user states: ${error.message}`, error.stack);
      // При ошибке возвращаем пустой массив, а не бросаем исключение
      return [];
    }
  }

  async getLatestUserState(userId: string): Promise<UserState | null> {
    return await this.stateRepository.findOne({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
    });
  }

  async createUserState(data: Partial<UserState>): Promise<UserState> {
    try {
      const state = this.stateRepository.create(data);
      return await this.stateRepository.save(state);
    } catch (error) {
      this.logger.error(`Error creating user state: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getUserStatesToday(userId: string): Promise<UserState[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return await this.stateRepository.find({
      where: {
        user_id: userId,
        created_at: Between(today, new Date()),
      },
      order: { created_at: 'ASC' },
    });
  }

  // ==================== User Settings ====================

  async findUserSettings(userId: string): Promise<UserSettings | null> {
    return await this.settingsRepository.findOne({ where: { user_id: userId } });
  }

  async createUserSettings(data: Partial<UserSettings>): Promise<UserSettings> {
    try {
      const settings = this.settingsRepository.create(data);
      return await this.settingsRepository.save(settings);
    } catch (error) {
      this.logger.error(`Error creating user settings: ${error.message}`, error.stack);
      throw error;
    }
  }

  async updateUserSettings(id: string, data: Partial<UserSettings>): Promise<UserSettings | null> {
    try {
      await this.settingsRepository.update(id, data);
      return await this.settingsRepository.findOne({ where: { id } });
    } catch (error) {
      this.logger.error(`Error updating user settings: ${error.message}`, error.stack);
      throw error;
    }
  }

  async upsertUserSettings(userId: string, data: Partial<UserSettings>): Promise<UserSettings> {
    try {
      const existing = await this.findUserSettings(userId);

      if (existing) {
        await this.settingsRepository.update(existing.id, data);
        const updated = await this.settingsRepository.findOne({ where: { id: existing.id } });
        return updated!;
      } else {
        return await this.createUserSettings({ ...data, user_id: userId });
      }
    } catch (error) {
      this.logger.error(`Error upserting user settings: ${error.message}`, error.stack);
      throw error;
    }
  }

  // ==================== Analytics Events ====================

  async findAnalyticsEvents(query: any): Promise<AnalyticsEvent[]> {
    const where: any = {};

    if (query.user_id) where.user_id = query.user_id;
    if (query.event_type) where.event_type = query.event_type;

    return await this.analyticsRepository.find({
      where,
      order: { created_at: 'DESC' },
      take: query.limit || 50,
      skip: query.offset || 0,
    });
  }

  async createAnalyticsEvent(data: Partial<AnalyticsEvent>): Promise<AnalyticsEvent> {
    try {
      const event = this.analyticsRepository.create(data);
      return await this.analyticsRepository.save(event);
    } catch (error) {
      this.logger.error(`Error creating analytics event: ${error.message}`, error.stack);
      throw error;
    }
  }

  // ==================== Work Sessions ====================

  async findWorkSessions(userId: string, limit: number = 50): Promise<WorkSession[]> {
    return await this.workSessionRepository.find({
      where: { user_id: userId },
      order: { start_time: 'DESC' },
      take: limit,
    });
  }

  async createWorkSession(data: Partial<WorkSession>): Promise<WorkSession> {
    try {
      const session = this.workSessionRepository.create(data);
      return await this.workSessionRepository.save(session);
    } catch (error) {
      this.logger.error(`Error creating work session: ${error.message}`, error.stack);
      throw error;
    }
  }

  async updateWorkSession(id: string, data: Partial<WorkSession>): Promise<WorkSession | null> {
    try {
      await this.workSessionRepository.update(id, data);
      return await this.workSessionRepository.findOne({ where: { id } });
    } catch (error) {
      this.logger.error(`Error updating work session: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getActiveWorkSession(userId: string): Promise<WorkSession | null> {
    try {
      const session = await this.workSessionRepository.findOne({
        where: {
          user_id: userId,
          completed: false,
        },
        order: { start_time: 'DESC' },
      });

      return session || null;
    } catch (error) {
      this.logger.error(`Error getting active work session: ${error.message}`);
      return null;
    }
  }

  async getWorkSessionStats(userId: string, startDate: Date, endDate: Date): Promise<any> {
    try {
      const totalSessions = await this.workSessionRepository.count({
        where: {
          user_id: userId,
          start_time: Between(startDate, endDate),
        },
      });

      const activeSessions = await this.workSessionRepository.count({
        where: {
          user_id: userId,
          completed: false
        },
      });

      const completedSessions = await this.workSessionRepository.find({
        where: {
          user_id: userId,
          start_time: Between(startDate, endDate),
          completed: true
        },
        select: ['planned_duration', 'start_time', 'actual_end_time', 'completed']
      });

      const totalDuration = completedSessions.reduce(
        (sum, session) => {
          if (session.actual_end_time && session.start_time) {
            const duration = Math.floor(
              (new Date(session.actual_end_time).getTime() - new Date(session.start_time).getTime()) / 60000
            );
            return sum + duration;
          }
          return sum + (session.planned_duration || 0);
        },
        0,
      );

      const averageDuration =
        completedSessions.length > 0 ? Math.round(totalDuration / completedSessions.length) : 0;

      return {
        total_sessions: totalSessions,
        active_sessions: activeSessions,
        completed_sessions: completedSessions.length,
        average_duration_minutes: averageDuration,
        total_work_time_minutes: totalDuration,
      };
    } catch (error) {
      this.logger.error(`Error getting work session stats: ${error.message}`);
      throw error;
    }
  }

  // ==================== Utility Methods ====================

  private getTimeCategory(hour: number): string {
    if (hour >= 6 && hour < 9) return 'morning';
    if (hour >= 9 && hour < 12) return 'late_morning';
    if (hour >= 12 && hour < 15) return 'after_lunch';
    if (hour >= 15 && hour < 18) return 'afternoon';
    if (hour >= 18 && hour < 21) return 'evening';
    return 'late_evening';
  }

  private calculateTaskProductivity(task: Task): number {
    let score = 1;

    if (task.priority === 'high') score += 0.5;
    if (task.complexity === 'high') score += 0.3;

    if (task.completed_at && task.started_at) {
      const duration =
        new Date(task.completed_at).getTime() - new Date(task.started_at).getTime();
      const hours = duration / (1000 * 60 * 60);
      const estimated = (task.estimated_duration || 60) / 60;

      if (hours <= estimated) {
        score += 0.2;
      }
    }

    return score;
  }
}
