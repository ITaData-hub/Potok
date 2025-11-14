import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  UseGuards, Logger, BadRequestException, NotFoundException,
  Put
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiSecurity } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { In, MoreThan, Repository } from 'typeorm';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';
import { User } from '../database/entities/user.entity';
import { Task } from '../database/entities/task.entity';
import { UserState } from '../database/entities/user-state.entity';
import { UserSettings } from '../database/entities/user-settings.entity';
import { AnalyticsEvent } from '../database/entities/analytics-event.entity';
import { WorkSession } from '../database/entities/work-session.entity';
import { DatabaseService } from './database.service';

@ApiTags('Database API')
@Controller('api/v1/db')
@UseGuards(ApiKeyGuard)
@ApiSecurity('api-key')
export class DatabaseController {
  private readonly logger = new Logger(DatabaseController.name);

  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Task) private readonly taskRepo: Repository<Task>,
    @InjectRepository(UserState) private readonly stateRepo: Repository<UserState>,
    @InjectRepository(UserSettings) private readonly settingsRepo: Repository<UserSettings>,
    @InjectRepository(AnalyticsEvent) private readonly analyticsRepo: Repository<AnalyticsEvent>,
    @InjectRepository(WorkSession) private readonly sessionRepo: Repository<WorkSession>,
    private databaseService: DatabaseService
  ) { }

  // ==================== Users ====================

  @Get('users')
  @ApiOperation({ summary: 'List users' })
  async listUsers(@Query() query: any) {
    const { limit, offset, ...whereConditions } = query;

    return await this.userRepo.find({
      where: whereConditions,
      take: limit ? Number(limit) : 100,
      skip: offset ? Number(offset) : 0,
      order: { created_at: 'DESC' },
    });
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get user by ID' })
  async getUser(@Param('id') id: string) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }
    return user;
  }

  @Post('users')
  @ApiOperation({ summary: 'Create user' })
  async createUser(@Body() data: any) {
    this.logger.log('📥 Creating new user...');

    if (!data || Object.keys(data).length === 0) {
      throw new BadRequestException('Request body is empty');
    }

    if (!data.max_user_id) {
      throw new BadRequestException('max_user_id is required');
    }

    // Создаём пользователя
    const user = this.userRepo.create({
      max_user_id: data.max_user_id,
      username: data.username || null,
      first_name: data.first_name || null,
      last_name: data.last_name || null,
      onboarding_completed: data.onboarding_completed || false,
      onboarded_at: data.onboarded_at || null,
      metadata: data.metadata || null,
    });

    const savedUser = await this.userRepo.save(user);
    this.logger.log(`✅ User created: ${savedUser.id}`);

    // Автоматическая инициализация связанных данных
    await this.initializeUserData(savedUser.id);

    return savedUser;
  }

  @Patch('users/:id')
  @ApiOperation({ summary: 'Update user' })
  async updateUser(@Param('id') id: string, @Body() data: any) {
    await this.userRepo.update(id, data);
    const updated = await this.userRepo.findOne({ where: { id } });

    if (!updated) {
      throw new NotFoundException(`User ${id} not found`);
    }

    return updated;
  }

  // ==================== Tasks ====================

  @Get('tasks')
  @ApiOperation({ summary: 'List tasks' })
  async listTasks(@Query() query: any) {
    const { limit, offset, order, status, user_id, priority } = query;

    const where: any = {};

    if (user_id) where.user_id = user_id;
    if (priority) where.priority = priority;

    // Обработка множественных статусов
    if (status) {
      if (typeof status === 'string' && status.includes(',')) {
        const statusArray = status.split(',').map(s => s.trim());
        where.status = In(statusArray);
      } else if (Array.isArray(status)) {
        where.status = In(status);
      } else {
        where.status = status;
      }
    }

    return await this.taskRepo.find({
      where,
      order: { created_at: order === 'ASC' ? 'ASC' : 'DESC' },
      take: Number(limit) || 100,
      skip: Number(offset) || 0,
    });
  }

  @Get('tasks/:id')
  @ApiOperation({ summary: 'Get task by ID' })
  async getTask(@Param('id') id: string) {
    const task = await this.taskRepo.findOne({ where: { id } });
    if (!task) {
      throw new NotFoundException(`Task ${id} not found`);
    }
    return task;
  }

  @Post('tasks')
  @ApiOperation({ summary: 'Create task' })
  async createTask(@Body() data: any) {
    // Валидация обязательных полей
    if (!data.title || typeof data.title !== 'string' || !data.title.trim()) {
      throw new BadRequestException('Task title is required and must not be empty');
    }

    if (!data.user_id) {
      throw new BadRequestException('user_id is required');
    }

    // Санитизация deadline - пустая строка → null
    if (data.deadline === '' || data.deadline === undefined) {
      data.deadline = null;
    }

    // Создание задачи с явным указанием всех полей
    const task = this.taskRepo.create({
      user_id: data.user_id,
      title: data.title.trim(),
      description: data.description || null,
      status: data.status || 'pending',
      priority: data.priority || 'medium',
      complexity: data.complexity || 'medium',
      required_energy: data.required_energy !== undefined ? Number(data.required_energy) : 5.0,
      required_focus: data.required_focus !== undefined ? Number(data.required_focus) : 50,
      estimated_duration: data.estimated_duration !== undefined ? Number(data.estimated_duration) : 60,
      deadline: data.deadline,
      tags: data.tags || null,
      metadata: data.metadata || null,
    });

    return await this.taskRepo.save(task);
  }

  @Patch('tasks/:id')
  @ApiOperation({ summary: 'Update task' })
  async updateTask(@Param('id') id: string, @Body() data: any) {
    // Санитизация deadline
    if (data.deadline === '') {
      data.deadline = null;
    }

    await this.taskRepo.update(id, data);
    const updated = await this.taskRepo.findOne({ where: { id } });

    if (!updated) {
      throw new NotFoundException(`Task ${id} not found`);
    }

    return updated;
  }

  @Delete('tasks/:id')
  @ApiOperation({ summary: 'Delete task' })
  async deleteTask(@Param('id') id: string) {
    const result = await this.taskRepo.delete(id);

    if (result.affected === 0) {
      throw new NotFoundException(`Task ${id} not found`);
    }

    return { success: true };
  }

  // ==================== User States ====================

  @Get('user-states')
  async listUserStates(@Query() query: any) {
    try {
      const results = await this.databaseService.findUserStates(query);
      
      // ИСПРАВЛЕНИЕ: Всегда возвращать массив
      if (!results) {
        this.logger.debug(`No user states found, returning empty array`);
        return [];
      }
      
      return Array.isArray(results) ? results : [];
    } catch (error) {
      this.logger.error(`Error listing user states: ${error.message}`);
      throw error;
    }
  }

  @Post('user-states')
  @ApiOperation({ summary: 'Create user state' })
  async createState(@Body() data: any) {
    if (!data.user_id) {
      throw new BadRequestException('user_id is required');
    }

    if (!data.test_type) {
      throw new BadRequestException('test_type is required');
    }

    // Валидация test_type
    const validTestTypes = ['energy', 'focus', 'motivation', 'stress'];
    if (!validTestTypes.includes(data.test_type)) {
      throw new BadRequestException(
        `test_type must be one of: ${validTestTypes.join(', ')}`
      );
    }

    const state = this.stateRepo.create({
      user_id: data.user_id,
      test_type: data.test_type,
      energy: data.energy !== undefined ? Number(data.energy) : 5.0,
      focus: data.focus !== undefined ? Number(data.focus) : 50,
      motivation: data.motivation !== undefined ? Number(data.motivation) : 5.0,
      stress: data.stress !== undefined ? Number(data.stress) : 5.0,
      test_count_today: data.test_count_today || 0,
      test_answers: data.test_answers || undefined, // ← undefined вместо null
      metadata: data.metadata || undefined, // ← undefined вместо null
    });

    return await this.stateRepo.save(state);
  }

  // ==================== User Settings ====================

  @Get('user-settings')
  @ApiOperation({ summary: 'List user settings' })
  async listSettings(@Query() query: any) {
    const { limit, offset, user_id } = query;
    const where: any = {};

    if (user_id) where.user_id = user_id;

    return await this.settingsRepo.find({
      where,
      take: Number(limit) || 100,
      skip: Number(offset) || 0,
    });
  }

  @Get('user-settings/:userId')
  @ApiOperation({ summary: 'Get settings by user ID' })
  async getSettings(@Param('userId') userId: string) {
    return await this.settingsRepo.findOne({ where: { user_id: userId } });
  }

  @Post('user-settings')
  @ApiOperation({ summary: 'Create user settings' })
  async createSettings(@Body() data: any) {
    if (!data.user_id) {
      throw new BadRequestException('user_id is required');
    }

    const settings = this.settingsRepo.create({
      user_id: data.user_id,
      notifications_enabled: data.notifications_enabled !== undefined ? data.notifications_enabled : true,
      test_reminders: data.test_reminders !== undefined ? data.test_reminders : true,
      work_start_time: data.work_start_time || '09:00',
      work_end_time: data.work_end_time || '18:00',
      preferences: data.preferences || undefined, // ← undefined вместо null
    });

    return await this.settingsRepo.save(settings);
  }

  @Patch('user-settings/:id')
  @ApiOperation({ summary: 'Update user settings' })
  async updateSettings(@Param('id') id: string, @Body() data: any) {
    await this.settingsRepo.update(id, data);
    const updated = await this.settingsRepo.findOne({ where: { id } });

    if (!updated) {
      throw new NotFoundException(`Settings ${id} not found`);
    }

    return updated;
  }

  // ==================== Analytics Events ====================

  @Get('analytics-events')
  @ApiOperation({ summary: 'List analytics events' })
  async listEvents(@Query() query: any) {
    const { limit, offset, user_id, event_type } = query;
    const where: any = {};

    if (user_id) where.user_id = user_id;
    if (event_type) where.event_type = event_type;

    return await this.analyticsRepo.find({
      where,
      order: { created_at: 'DESC' },
      take: Number(limit) || 50,
      skip: Number(offset) || 0,
    });
  }

  @Post('analytics-events')
  @ApiOperation({ summary: 'Create analytics event' })
  async createEvent(@Body() data: any) {
    if (!data.user_id) {
      throw new BadRequestException('user_id is required');
    }

    if (!data.event_type) {
      throw new BadRequestException('event_type is required');
    }

    const event = this.analyticsRepo.create({
      user_id: data.user_id,
      event_type: data.event_type,
      event_data: data.event_data || undefined,
    });

    return await this.analyticsRepo.save(event);
  }

  // ==================== Work Sessions ====================

  @Get('work-sessions')
  @ApiOperation({ summary: 'List work sessions' })
  async listSessions(@Query() query: any) {
    const { limit, offset, user_id } = query;
    const where: any = {};

    if (user_id) where.user_id = user_id;

    return await this.sessionRepo.find({
      where,
      order: { start_time: 'DESC' },
      take: Number(limit) || 50,
      skip: Number(offset) || 0,
    });
  }

  @Post('work-sessions')
  @ApiOperation({ summary: 'Create work session' })
  async createSession(@Body() data: any) {
    this.logger.log('📥 Creating work session...');

    if (!data.user_id) {
      throw new BadRequestException('user_id is required');
    }

    if (!data.start_time) {
      throw new BadRequestException('start_time is required');
    }

    if (!data.session_type) {
      throw new BadRequestException('session_type is required');
    }

    if (!data.planned_duration) {
      throw new BadRequestException('planned_duration is required');
    }

    const session = this.sessionRepo.create({
      user_id: data.user_id,
      task_id: data.task_id || null,
      session_type: data.session_type,
      start_time: data.start_time,
      planned_duration: data.planned_duration,
      actual_end_time: data.actual_end_time || null,
      completed: data.completed !== undefined ? data.completed : false,
      interruptions: data.interruptions || 0,
      focus_rating: data.focus_rating || null,
      completion_notes: data.completion_notes || null,
      metadata: data.metadata || undefined,
    });

    const saved = await this.sessionRepo.save(session);
    this.logger.log(`✅ Work session created: ${saved.id}`);

    return saved;
  }

  @Patch('work-sessions/:id')
  @ApiOperation({ summary: 'Update work session' })
  async updateSession(@Param('id') id: string, @Body() data: any) {
    const session = await this.sessionRepo.findOne({ where: { id } });

    if (!session) {
      throw new NotFoundException(`Work session ${id} not found`);
    }

    // Обновляем updated_at автоматически
    const updateData = {
      ...data,
      updated_at: new Date(),
    };

    await this.sessionRepo.update(id, updateData);
    const updated = await this.sessionRepo.findOne({ where: { id } });

    this.logger.log(`✅ Work session updated: ${id}`);

    return updated;
  }

  @Get('work-sessions/user/:userId/active')
  @ApiOperation({ summary: 'Get active work session for user' })
  async getActiveSession(@Param('userId') userId: string) {
    const session = await this.sessionRepo.findOne({
      where: {
        user_id: userId,
        completed: false,
      },
      order: { start_time: 'DESC' },
    });

    return session || null;
  }

  @Get('work-sessions/:id')
  @ApiOperation({ summary: 'Get work session by ID' })
  async getSession(@Param('id') id: string) {
    const session = await this.sessionRepo.findOne({
      where: { id },
      relations: ['task', 'user'],
    });

    if (!session) {
      throw new NotFoundException(`Work session ${id} not found`);
    }

    return session;
  }

  @Put('work-sessions/:id/complete')
  @ApiOperation({ summary: 'Complete work session' })
  async completeSession(
    @Param('id') id: string,
    @Body() data: { focus_rating?: number; completion_notes?: string },
  ) {
    const session = await this.sessionRepo.findOne({ where: { id } });

    if (!session) {
      throw new NotFoundException(`Work session ${id} not found`);
    }

    await this.sessionRepo.update(id, {
      actual_end_time: new Date(),
      completed: true,
      focus_rating: data.focus_rating,
      completion_notes: data.completion_notes,
      updated_at: new Date(),
    });

    const updated = await this.sessionRepo.findOne({ where: { id } });

    this.logger.log(`✅ Work session ${id} completed`);

    return updated;
  }

  @Put('work-sessions/:id/interrupt')
  @ApiOperation({ summary: 'Add interruption to session' })
  async addInterruption(@Param('id') id: string) {
    const session = await this.sessionRepo.findOne({ where: { id } });

    if (!session) {
      throw new NotFoundException(`Work session ${id} not found`);
    }

    await this.sessionRepo.update(id, {
      interruptions: session.interruptions + 1,
      updated_at: new Date(),
    });

    const updated = await this.sessionRepo.findOne({ where: { id } });
    if (updated)
      this.logger.log(`⚠️ Interruption added to session ${id}. Total: ${updated.interruptions}`);

    return updated;
  }

  @Get('work-sessions/user/:userId/stats')
  @ApiOperation({ summary: 'Get user session statistics' })
  async getUserSessionStats(
    @Param('userId') userId: string,
    @Query('period') period: string = 'week',
  ) {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'day':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    const sessions = await this.sessionRepo.find({
      where: {
        user_id: userId,
        start_time: MoreThan(startDate),
      },
      order: { start_time: 'DESC' },
    });

    const completedSessions = sessions.filter((s) => s.completed);
    const totalSessions = sessions.length;

    const totalTime = completedSessions.reduce((sum, s) => {
      if (s.actual_end_time) {
        const start = new Date(s.start_time).getTime();
        const end = new Date(s.actual_end_time).getTime();
        return sum + (end - start) / 60000; // в минутах
      }
      return sum;
    }, 0);

    const avgFocusRating =
      completedSessions
        .filter((s) => s.focus_rating)
        .reduce((sum, s) => sum + (s.focus_rating || 0), 0) /
      (completedSessions.filter((s) => s.focus_rating).length || 1);

    const totalInterruptions = sessions.reduce(
      (sum, s) => sum + (s.interruptions || 0),
      0,
    );

    // Группировка по типу сессии
    const sessionsByType = sessions.reduce((acc, s) => {
      acc[s.session_type] = (acc[s.session_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      period,
      start_date: startDate.toISOString(),
      end_date: now.toISOString(),
      total_sessions: totalSessions,
      completed_sessions: completedSessions.length,
      total_time_minutes: Math.round(totalTime),
      average_session_duration: Math.round(totalTime / (completedSessions.length || 1)),
      average_focus_rating: Number(avgFocusRating.toFixed(2)),
      total_interruptions: totalInterruptions,
      average_interruptions_per_session: Number(
        (totalInterruptions / (totalSessions || 1)).toFixed(2),
      ),
      sessions_by_type: sessionsByType,
    };
  }

  @Delete('work-sessions/:id')
  @ApiOperation({ summary: 'Delete work session' })
  async deleteSession(@Param('id') id: string) {
    const result = await this.sessionRepo.delete(id);

    if (result.affected === 0) {
      throw new NotFoundException(`Work session ${id} not found`);
    }

    return { success: true };
  }
  // ==================== Utility Endpoints ====================

  /**
   * Инициализация связанных данных для конкретного пользователя
   */
  @Post('users/:id/initialize')
  @ApiOperation({ summary: 'Initialize user data (settings, state) for existing user' })
  async initializeExistingUser(@Param('id') userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    await this.initializeUserData(userId);

    return {
      success: true,
      message: 'User data initialized successfully',
      userId: userId,
    };
  }

  /**
   * Массовая инициализация всех пользователей
   */
  @Post('users/initialize-all')
  @ApiOperation({ summary: 'Initialize data for all users missing settings or states' })
  async initializeAllUsers() {
    this.logger.log('🔧 Starting mass user initialization...');

    const users = await this.userRepo.find();
    let initialized = 0;
    let skipped = 0;
    let errors = 0;

    for (const user of users) {
      try {
        // Проверяем наличие settings и states
        const settings = await this.settingsRepo.findOne({
          where: { user_id: user.id }
        });
        const states = await this.stateRepo.find({
          where: { user_id: user.id },
          take: 1,
        });

        const needsInit = !settings || !states || states.length === 0;

        if (needsInit) {
          await this.initializeUserData(user.id);
          initialized++;
          this.logger.log(`  ✅ Initialized user ${user.id}`);
        } else {
          skipped++;
        }
      } catch (error) {
        this.logger.error(`  ❌ Error initializing user ${user.id}: ${error.message}`);
        errors++;
      }
    }

    this.logger.log(`✅ Initialization complete: ${initialized} initialized, ${skipped} skipped, ${errors} errors`);

    return {
      success: true,
      total: users.length,
      initialized,
      skipped,
      errors,
    };
  }

  // ==================== Private Methods ====================

  /**
   * Инициализация связанных данных для пользователя
   */
  private async initializeUserData(userId: string): Promise<void> {
    try {
      this.logger.log(`🔧 Initializing data for user ${userId}...`);

      // 1. Создаём user_settings если не существует
      const existingSettings = await this.settingsRepo.findOne({
        where: { user_id: userId }
      });

      if (!existingSettings) {
        // Используем save напрямую вместо create для обхода типизации
        const settings = new UserSettings();
        settings.user_id = userId;
        settings.notifications_enabled = true;
        settings.test_reminders = true;
        settings.work_start_time = '09:00';
        settings.work_end_time = '18:00';
        // preferences остается undefined (nullable поле)

        await this.settingsRepo.save(settings);
        this.logger.log(`  ✅ User settings created`);
      } else {
        this.logger.log(`  ⏭️  User settings already exist`);
      }

      // 2. Создаём начальные user_states если не существуют
      const existingStates = await this.stateRepo.find({
        where: { user_id: userId },
        take: 1,
      });

      if (!existingStates || existingStates.length === 0) {
        // Создаём начальные состояния для всех типов тестов
        const testTypes: ('energy' | 'focus' | 'motivation' | 'stress')[] = [
          'energy', 'focus', 'motivation', 'stress'
        ];

        for (const testType of testTypes) {
          const state = new UserState();
          state.user_id = userId;
          state.test_type = testType;
          state.energy = 5.0;
          state.focus = 50;
          state.motivation = 5.0;
          state.stress = 5.0;
          state.test_count_today = 0;
          // test_answers и metadata остаются undefined (nullable)

          await this.stateRepo.save(state);
        }

        this.logger.log(`  ✅ Initial user states created (all test types)`);
      } else {
        this.logger.log(`  ⏭️  User states already exist`);
      }

      this.logger.log(`✅ User data initialization complete for ${userId}`);

    } catch (error) {
      this.logger.error(`⚠️ Error initializing user data: ${error.message}`, error.stack);
      // Не падаем, чтобы не блокировать создание пользователя
    }
  }
}
