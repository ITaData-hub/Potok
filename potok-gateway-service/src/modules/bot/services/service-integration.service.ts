// potok-gateway-service/src/modules/bot/services/service-integration.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AdminClientService } from '../../admin-client/admin-client.service';
import { WebsocketGateway } from '../../websocket/websocket.gateway';

@Injectable()
export class ServiceIntegration {
  private readonly logger = new Logger(ServiceIntegration.name);
  private readonly stateServiceUrl: string;
  private readonly taskServiceUrl: string;
  private readonly adminServiceUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly adminClient: AdminClientService,
    private readonly websocketGateway?: WebsocketGateway, // Опционально для WebSocket
  ) {
    this.stateServiceUrl = this.configService.get<string>('STATE_SERVICE_URL') || '';
    this.taskServiceUrl = this.configService.get<string>('TASK_SERVICE_URL') || '';
    this.adminServiceUrl = this.configService.get<string>('ADMIN_SERVICE_URL') || '';
  }

  // ==================== State Service ====================

  async getCurrentState(userId: string): Promise<any> {
    try {
      this.logger.log(`Fetching current state for user ${userId}`);
      
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.stateServiceUrl}/api/v1/state/user/${userId}/current`,
          {
            timeout: 5000,
            headers: {
              'X-Service-Name': 'gateway-service',
            }
          }
        ),
      );
      
      this.logger.log(`State fetched successfully for user ${userId}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Error fetching current state for user ${userId}: ${error.message}`);
      return this.getDefaultState();
    }
  }

  async getNextAvailableTest(userId: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.stateServiceUrl}/api/v1/tests/next/${userId}`, {
          timeout: 5000,
        }),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Error fetching next test: ${error.message}`);
      return null;
    }
  }

  async getTestStructure(testType: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.stateServiceUrl}/api/v1/tests/structure/${testType}`, {
          timeout: 5000,
        }),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Error fetching test structure: ${error.message}`);
      throw error;
    }
  }

  async submitTest(userId: string, testType: string, answers: any): Promise<any> {
    const payload = {
      testType,
      answers: {
        q1: Number(answers.q1),
        q2: Number(answers.q2),
        q3: Number(answers.q3),
      }
    };
    return await firstValueFrom(
      this.httpService.post(`${this.stateServiceUrl}/api/v1/tests/submit/${userId}`, payload, { timeout: 10000 })
    );
  }

  async getRecommendations(userId: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.stateServiceUrl}/api/v1/state/user/${userId}/recommendations`, {
          timeout: 5000,
        }),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Error fetching recommendations: ${error.message}`);
      return { recommendations: [], work_mode: 'NORMAL', break_needed: false };
    }
  }

  async getForecast(userId: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.stateServiceUrl}/api/v1/state/user/${userId}/forecast`, {
          timeout: 5000,
        }),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Error fetching forecast: ${error.message}`);
      throw error;
    }
  }

  // ==================== Task Service ====================

  async getUserTasks(userId: string): Promise<any[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.taskServiceUrl}/api/v1/distribution/user/${userId}/tasks`, {
          timeout: 5000,
        }),
      );
      return response.data.tasks || [];
    } catch (error) {
      this.logger.error(`Error fetching tasks: ${error.message}`);
      return [];
    }
  }

  async getTask(taskId: string): Promise<any> {
    try {
      this.logger.log(`🔍 Fetching task with ID: ${taskId}`);
      
      // Получаем все задачи пользователя
      const tasks = await this.adminClient.dbList('tasks', {}, 100, 0);
      
      // Фильтруем вручную
      const task = tasks.find(t => t.id === taskId);
      
      if (!task) {
        this.logger.warn(`❌ Task not found: ${taskId}`);
        return null;
      }
      
      this.logger.log(`✅ Task found: ${task.id} - "${task.title}"`);
      return task;
    } catch (error) {
      this.logger.error(`Error fetching task ${taskId}: ${error.message}`);
      return null;
    }
  }

  async calculateMIT(userId: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.taskServiceUrl}/api/v1/distribution/user/${userId}/mit`,
          {},
          { timeout: 10000 },
        ),
      );
      return response.data.mit;
    } catch (error) {
      this.logger.error(`Error calculating MIT: ${error.message}`);
      return null;
    }
  }

  async prioritizeTasks(userId: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.taskServiceUrl}/api/v1/distribution/user/${userId}/prioritize`,
          {},
          { timeout: 10000 },
        ),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Error prioritizing tasks: ${error.message}`);
      throw error;
    }
  }

  async rescheduleTasks(userId: string, taskIds?: string[]): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.taskServiceUrl}/api/v1/distribution/user/${userId}/reschedule`,
          { taskIds },
          { timeout: 10000 },
        ),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Error rescheduling tasks: ${error.message}`);
      throw error;
    }
  }

  async createTask(userId: string, taskData: any): Promise<any> {
    try {
      const task = await this.adminClient.dbCreate('tasks', {
        user_id: userId,
        ...taskData,
        status: 'pending',
        created_at: new Date().toISOString(),
      });
      
      // Инвалидируем кеш задач
      await this.adminClient.redisDel(`potok:distribution:user:${userId}:tasks:sorted`);
      
      return task;
    } catch (error) {
      this.logger.error(`Error creating task: ${error.message}`);
      throw error;
    }
  }

  async updateTask(taskId: string, updates: any): Promise<any> {
    try {
      const task = await this.adminClient.dbUpdate('tasks', taskId, {
        ...updates,
        updated_at: new Date().toISOString(),
      });
      
      // Инвалидируем кеш
      if (task && task.user_id) {
        await this.adminClient.redisDel(`potok:distribution:user:${task.user_id}:tasks:sorted`);
        await this.adminClient.redisDel(`potok:distribution:user:${task.user_id}:mit`);
      }
      
      return task;
    } catch (error) {
      this.logger.error(`Error updating task: ${error.message}`);
      throw error;
    }
  }

  async cancelTask(taskId: string): Promise<any> {
    try {
      const task = await this.updateTask(taskId, {
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
      });
      
      this.logger.log(`Task cancelled: ${taskId}`);
      return task;
    } catch (error) {
      this.logger.error(`Error cancelling task: ${error.message}`);
      throw error;
    }
  }
  
  async deleteTask(taskId: string): Promise<void> {
    try {
      await this.adminClient.dbDelete('tasks', taskId);
      
      // Инвалидируем кеш
      const task = await this.getTask(taskId);
      if (task && task.user_id) {
        await this.adminClient.redisDel(`potok:distribution:user:${task.user_id}:tasks:sorted`);
        await this.adminClient.redisDel(`potok:distribution:user:${task.user_id}:mit`);
      }
      
      this.logger.log(`Task deleted: ${taskId}`);
    } catch (error) {
      this.logger.error(`Error deleting task: ${error.message}`);
      throw error;
    }
  }

  // ==================== НОВЫЕ МЕТОДЫ ДЛЯ WORK SESSIONS ====================

  async createWorkSession(userId: string, sessionData: any): Promise<any> {
    try {
      const session = await this.adminClient.dbCreate('work-sessions', {
        user_id: userId,
        ...sessionData,
      });

      this.logger.log(`Work session created: ${session.id}`);
      return session;
    } catch (error) {
      this.logger.error(`Error creating work session: ${error.message}`);
      throw error;
    }
  }

  async completeWorkSession(sessionId: string, completionData: any): Promise<any> {
    try {
      const session = await this.adminClient.dbUpdate('work-sessions', sessionId, {
        ...completionData,
      });

      this.logger.log(`Work session completed: ${sessionId}`);
      return session;
    } catch (error) {
      this.logger.error(`Error completing work session: ${error.message}`);
      throw error;
    }
  }

  async addSessionInterruption(sessionId: string): Promise<void> {
    try {
      const session = await this.adminClient.dbFindOne('work-sessions', { id: sessionId });
      
      if (session) {
        await this.adminClient.dbUpdate('work-sessions', sessionId, {
          interruptions: (session.interruptions || 0) + 1,
        });
      }
    } catch (error) {
      this.logger.error(`Error adding session interruption: ${error.message}`);
    }
  }

  async getActiveSession(userId: string): Promise<any> {
    try {
      // Сначала проверить Redis
      const cachedSession = await this.adminClient.redisGet(
        `potok:user:${userId}:active_session`,
      );

      if (cachedSession) {
        return JSON.parse(cachedSession);
      }

      // Если нет в кеше, искать в БД через Admin Service API
      try {
        const response = await firstValueFrom(
          this.httpService.get(
            `${this.adminServiceUrl}/api/v1/db/work-sessions/user/${userId}/active`,
            {
              headers: { 
                'x-api-key': this.configService.get<string>('ADMIN_API_KEY') || '',
              },
              timeout: 5000,
            },
          ),
        );

        return response.data;
      } catch (error) {
        // Если endpoint не существует, fallback к поиску через dbList
        const sessions = await this.adminClient.dbList('work-sessions', {
          user_id: userId,
          completed: false,
        }, 1, 0);

        return sessions.length > 0 ? sessions[0] : null;
      }
    } catch (error) {
      this.logger.error(`Error getting active session: ${error.message}`);
      return null;
    }
  }

  async setActiveSession(userId: string, sessionData: any): Promise<void> {
    try {
      await this.adminClient.redisSet(
        `potok:user:${userId}:active_session`,
        JSON.stringify(sessionData),
        3600, // 1 час TTL
      );

      this.logger.log(`Active session cached for user ${userId}`);
    } catch (error) {
      this.logger.error(`Error setting active session: ${error.message}`);
    }
  }

  async clearActiveSession(userId: string): Promise<void> {
    try {
      await this.adminClient.redisDel(`potok:user:${userId}:active_session`);
      this.logger.log(`Active session cleared for user ${userId}`);
    } catch (error) {
      this.logger.error(`Error clearing active session: ${error.message}`);
    }
  }

  // ==================== ANALYTICS ====================

  async createAnalyticsEvent(userId: string, eventData: any): Promise<void> {
    try {
      await this.adminClient.dbCreate('analytics-events', {
        user_id: userId,
        timestamp: new Date().toISOString(),
        ...eventData,
      });

      this.logger.log(`Analytics event created: ${eventData.event_type}`);
    } catch (error) {
      this.logger.error(`Error creating analytics event: ${error.message}`);
    }
  }

  async getUserStats(userId: string, period: string = 'week'): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.adminServiceUrl}/api/v1/analytics/user/${userId}/summary?period=${period}`,
          { timeout: 5000 },
        ),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Error fetching user stats: ${error.message}`);
      return this.getDefaultStats();
    }
  }

  async getUserPatterns(userId: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.adminServiceUrl}/api/v1/analytics/user/${userId}/patterns`, {
          timeout: 5000,
        }),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Error fetching user patterns: ${error.message}`);
      return null;
    }
  }

  async getTasksAnalytics(userId: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.adminServiceUrl}/api/v1/analytics/user/${userId}/tasks-analytics`, {
          timeout: 5000,
        }),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Error fetching tasks analytics: ${error.message}`);
      return null;
    }
  }

  // ==================== WEBSOCKET INTEGRATION ====================

  async sendWebSocketEvent(userId: string, event: string, data: any): Promise<void> {
    try {
      if (this.websocketGateway) {
        this.websocketGateway.sendToUser(userId, event, data);
        this.logger.log(`WebSocket event sent: ${event} to user ${userId}`);
      } else {
        this.logger.warn('WebSocket gateway not available');
      }
    } catch (error) {
      this.logger.error(`Error sending WebSocket event: ${error.message}`);
    }
  }

  // ==================== Defaults ====================

  private getDefaultState(): any {
    return {
      energy: 5,
      focus: 50,
      motivation: 5,
      stress: 5,
      ui_mode: 'NORMAL',
      ui_mode_description: 'Нормальное состояние',
      circadian: { phase: 'NORMAL', factor: 1.0 },
      is_peak_time: false,
      peak_hours: [],
    };
  }

  private getDefaultStats(): any {
    return {
      total_tests: 0,
      average_energy: 0,
      average_focus: 0,
      average_motivation: 0,
      average_stress: 0,
      tasks_completed: 0,
      total_tasks: 0,
      completion_rate: 0,
      total_work_time: 0,
      work_sessions: 0,
      peak_hours: [],
    };
  }
}
