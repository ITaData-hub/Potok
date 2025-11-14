import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AdminClientService } from '../admin-client/admin-client.service';
import { StateClientService } from '../state-client/state-client.service';
import { StateMatchAlgorithm } from './logic/state-match-algorithm';
import { MitCalculatorService } from './services/mit-calculator.service';
import { PriorityCalculatorService } from './services/priority-calculator.service';

@Injectable()
export class DistributionService {
  private readonly logger = new Logger(DistributionService.name);

  constructor(
    private readonly adminClient: AdminClientService,
    private readonly stateClient: StateClientService,
    private readonly stateMatchAlgorithm: StateMatchAlgorithm,
    private readonly mitCalculator: MitCalculatorService,
    private readonly priorityCalculator: PriorityCalculatorService,
  ) {}

  /**
   * Получить отсортированные задачи пользователя
   */
  async getUserTasksSorted(userId: string): Promise<any> {
    this.logger.debug(`Getting sorted tasks for user ${userId}`);

    try {
      // Получаем текущее состояние пользователя
      const userState = await this.stateClient.getCurrentState(userId);
      
      // Получаем все задачи пользователя
      const tasks = await this.adminClient.dbList('tasks', {
        user_id: userId,
        status: ['pending', 'in_progress'],
      });

      if (!tasks || tasks.length === 0) {
        return {
          userId,
          tasks: [],
          count: 0,
          message: 'No tasks found',
        };
      }

      // ✅ ДОБАВЛЕНО: Проверка, что все задачи принадлежат пользователю
      const invalidTasks = tasks.filter(t => t.user_id !== userId);
      if (invalidTasks.length > 0) {
        this.logger.error(
          `🚨 SECURITY: Found ${invalidTasks.length} tasks not belonging to user ${userId}: ` +
          invalidTasks.map(t => `${t.id} (owner: ${t.user_id})`).join(', ')
        );
        
        // Фильтруем только задачи пользователя
        const validTasks = tasks.filter(t => t.user_id === userId);
        
        if (validTasks.length === 0) {
          return {
            userId,
            tasks: [],
            count: 0,
            message: 'No valid tasks found',
          };
        }
      }

      // Приоритизируем задачи
      const prioritized = await this.priorityCalculator.prioritizeTasks(
        tasks.filter(t => t.user_id === userId), // Дополнительная фильтрация
        this.mapToUserState(userState),
        this.mapToCircadianContext(userState.circadian),
      );

      return {
        userId,
        tasks: prioritized,
        count: prioritized.length,
        state: {
          energy: userState.energy,
          focus: userState.focus,
          ui_mode: userState.ui_mode,
        },
        sorted_at: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Error getting sorted tasks: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Пересортировать задачи пользователя
   */
  async prioritizeUserTasks(userId: string): Promise<any> {
    this.logger.debug(`Prioritizing tasks for user ${userId}`);

    // Получаем актуальное состояние и пересортировываем
    const result = await this.getUserTasksSorted(userId);

    // Кешируем результат в Redis на 30 минут
    await this.cacheTasksPrioritization(userId, result);

    return result;
  }

  /**
   * Вычислить MIT для пользователя
   */
  async calculateUserMIT(userId: string): Promise<any> {
    this.logger.debug(`Calculating MIT for user ${userId}`);

    try {
      // Проверяем кеш
      const cachedMIT = await this.getCachedMIT(userId);
      if (cachedMIT) {
        // ✅ КРИТИЧНО: Проверяем владельца задачи из кеша
        try {
          const cachedTask = await this.adminClient.dbGet('tasks', cachedMIT.taskId);
          
          if (!cachedTask) {
            this.logger.warn(
              `Cached MIT task ${cachedMIT.taskId} not found in database. Invalidating cache.`
            );
            await this.invalidateMITCache(userId);
            // Продолжаем к пересчету
          } else if (cachedTask.user_id !== userId) {
            this.logger.error(
              `🚨 CACHE CORRUPTION: Cached MIT task ${cachedMIT.taskId} ` +
              `for user ${userId} actually belongs to ${cachedTask.user_id}. ` +
              `Invalidating cache and recalculating.`
            );
            
            // Инвалидируем плохой кеш
            await this.invalidateMITCache(userId);
            
            // НЕ возвращаем, продолжаем вычисление
          } else {
            // Задача принадлежит пользователю - возвращаем кеш
            this.logger.debug(`✅ Returning valid cached MIT for user ${userId}`);
            return { userId, mit: cachedMIT, cached: true };
          }
        } catch (error) {
          this.logger.error(`Error validating cached MIT: ${error.message}`);
          await this.invalidateMITCache(userId);
          // Продолжаем к пересчету
        }
      }

      // Получаем состояние
      const userState = await this.stateClient.getCurrentState(userId);

      // Получаем задачи с явной фильтрацией по user_id
      const tasks = await this.adminClient.dbList('tasks', {
        user_id: userId, // ✅ Явная фильтрация
        status: ['pending', 'in_progress'],
      });

      if (!tasks || tasks.length === 0) {
        this.logger.debug(`No tasks available for MIT calculation for user ${userId}`);
        return {
          userId,
          mit: null,
          message: 'No tasks available for MIT calculation',
        };
      }

      // ✅ ДОПОЛНИТЕЛЬНАЯ ПРОВЕРКА: Все задачи принадлежат пользователю
      const invalidTasks = tasks.filter(t => t.user_id !== userId);
      if (invalidTasks.length > 0) {
        this.logger.error(
          `🚨 SECURITY BREACH: dbList returned ${invalidTasks.length} tasks not belonging to user ${userId}: ` +
          invalidTasks.map(t => `${t.id} (owner: ${t.user_id})`).join(', ')
        );
        
        // Используем только валидные задачи
        const validTasks = tasks.filter(t => t.user_id === userId);
        
        if (validTasks.length === 0) {
          return {
            userId,
            mit: null,
            message: 'No valid tasks available',
          };
        }
        
        // Продолжаем с валидными задачами
        return await this.calculateMITFromTasks(userId, validTasks, userState);
      }

      // Все задачи валидны - продолжаем нормально
      return await this.calculateMITFromTasks(userId, tasks, userState);
      
    } catch (error) {
      this.logger.error(`Error calculating MIT for user ${userId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Вспомогательный метод для вычисления MIT из валидных задач
   */
  private async calculateMITFromTasks(userId: string, tasks: any[], userState: any): Promise<any> {
    // Вычисляем MIT
    const mit = await this.mitCalculator.calculateMIT(
      tasks,
      this.mapToUserState(userState),
      this.mapToCircadianContext(userState.circadian),
    );

    if (!mit) {
      this.logger.debug(`Could not determine MIT for user ${userId}`);
      return {
        userId,
        mit: null,
        message: 'Could not determine MIT',
      };
    }

    // ✅ ФИНАЛЬНАЯ ПРОВЕРКА: MIT задача принадлежит пользователю
    const mitTask = await this.adminClient.dbGet('tasks', mit.taskId);
    
    if (!mitTask) {
      this.logger.error(
        `🚨 MIT CALCULATION ERROR: Calculated MIT task ${mit.taskId} not found in database`
      );
      
      return {
        userId,
        mit: null,
        message: 'MIT calculation error: task not found',
      };
    }

    if (mitTask.user_id !== userId) {
      this.logger.error(
        `🚨 MIT CALCULATION ERROR: Calculated MIT task ${mit.taskId} ` +
        `does not belong to user ${userId} (belongs to ${mitTask.user_id})`
      );
      
      return {
        userId,
        mit: null,
        message: 'MIT calculation error: task ownership mismatch',
      };
    }

    this.logger.log(`✅ Valid MIT calculated for user ${userId}: ${mit.title} (task: ${mit.taskId})`);

    // Кешируем MIT на 60 минут
    await this.cacheMIT(userId, mit);

    return {
      userId,
      mit,
      calculated_at: new Date().toISOString(),
    };
  }

  /**
   * Отложить задачи
   */
  async rescheduleTasks(
    userId: string,
    taskIds?: string[],
    reason?: string,
  ): Promise<any> {
    this.logger.debug(`Rescheduling tasks for user ${userId}`);

    try {
      // Если не указаны конкретные задачи, выбираем все с низким state match
      let tasksToReschedule: any[];

      if (taskIds && taskIds.length > 0) {
        // ✅ ДОБАВЛЕНО: Проверка владельца при получении задач по ID
        tasksToReschedule = await Promise.all(
          taskIds.map(async (id) => {
            const task = await this.adminClient.dbGet('tasks', id);
            
            // Проверяем владельца
            if (task && task.user_id !== userId) {
              this.logger.error(
                `🚨 SECURITY: User ${userId} tried to reschedule task ${id} owned by ${task.user_id}`
              );
              return null; // Исключаем задачу
            }
            
            return task;
          }),
        );
        
        // Фильтруем null (чужие задачи)
        tasksToReschedule = tasksToReschedule.filter(t => t !== null);
        
      } else {
        // Получаем все задачи и фильтруем по state match
        const allTasks = await this.getUserTasksSorted(userId);
        tasksToReschedule = allTasks.tasks
          .filter((t) => t.state_match_score < 0.4 && !t.should_defer)
          .map((t) => t.task);
      }

      if (tasksToReschedule.length === 0) {
        return {
          userId,
          rescheduled: [],
          message: 'No tasks need rescheduling',
        };
      }

      // Рекомендуем новое время для каждой задачи
      const rescheduled = tasksToReschedule.map((task) => {
        const newTime = this.suggestBetterTime(task);
        
        return {
          taskId: task.id,
          title: task.title,
          current_time: 'now',
          suggested_time: newTime,
          reason: reason || 'Low state match with current condition',
        };
      });

      // Логируем событие
      await this.logRescheduleEvent(userId, rescheduled);

      return {
        userId,
        rescheduled,
        count: rescheduled.length,
        rescheduled_at: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Error rescheduling tasks: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * История распределения
   */
  async getDistributionHistory(userId: string): Promise<any> {
    try {
      const events = await this.adminClient.dbList('analytics_events', {
        user_id: userId,
        event_type: ['task_assigned', 'task_completed', 'task_rescheduled', 'mit_calculated'],
        order_by: 'created_at',
        order: 'DESC',
        limit: 50,
      });

      return {
        userId,
        events: events || [],
        count: events?.length || 0,
      };
    } catch (error) {
      this.logger.error(`Error getting distribution history: ${error.message}`);
      throw error;
    }
  }

  // ==================== Кеширование ====================

  private async getCachedMIT(userId: string): Promise<any> {
    try {
      const cached = await this.adminClient.redisGet(`potok:distribution:user:${userId}:mit`);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      this.logger.error(`Error getting cached MIT: ${error.message}`);
      return null;
    }
  }

  private async cacheMIT(userId: string, mit: any): Promise<void> {
    try {
      // ✅ ДОБАВЛЕНО: Включаем userId в кеш для дополнительной проверки
      const cacheData = {
        ...mit,
        _cached_for_user: userId, // Метаданные для проверки
        _cached_at: new Date().toISOString(),
      };
      
      await this.adminClient.redisSet(
        `potok:distribution:user:${userId}:mit`,
        JSON.stringify(cacheData),
        3600, // 60 минут
      );
      
      this.logger.debug(`✅ MIT cached for user ${userId}: task ${mit.taskId}`);
    } catch (error) {
      this.logger.error(`Error caching MIT: ${error.message}`);
    }
  }

  private async invalidateMITCache(userId: string): Promise<void> {
    try {
      await this.adminClient.redisDel(`potok:distribution:user:${userId}:mit`);
      this.logger.debug(`MIT cache invalidated for user ${userId}`);
    } catch (error) {
      this.logger.error(`Error invalidating MIT cache: ${error.message}`);
    }
  }

  private async cacheTasksPrioritization(userId: string, result: any): Promise<void> {
    try {
      await this.adminClient.redisSet(
        `potok:distribution:user:${userId}:tasks:sorted`,
        JSON.stringify(result),
        1800, // 30 минут
      );
    } catch (error) {
      this.logger.error(`Error caching prioritization: ${error.message}`);
    }
  }

  // ==================== Вспомогательные методы ====================

  private mapToUserState(stateData: any): any {
    return {
      energy: stateData.energy || 5,
      focus: stateData.focus || 50,
      motivation: stateData.motivation || 5,
      stress: stateData.stress || 5,
      energy_adjusted: stateData.energy_adjusted || stateData.energy || 5,
      focus_adjusted: stateData.focus_adjusted || stateData.focus || 50,
    };
  }

  private mapToCircadianContext(circadianData: any): any {
    return {
      current_factor: circadianData?.factor || 1.0,
      phase: circadianData?.phase || 'NORMAL',
      is_peak_time: circadianData?.is_peak_time || false,
    };
  }

  private suggestBetterTime(task: any): string {
    const complexity = task.complexity || 'medium';

    if (complexity === 'high') {
      return '08:00-12:00 (утренний пик продуктивности)';
    } else if (complexity === 'medium') {
      return '08:00-12:00 или 16:00-18:00 (пиковые периоды)';
    } else {
      return '12:00-14:00 или 18:00-20:00 (время для легких задач)';
    }
  }

  private async logRescheduleEvent(userId: string, rescheduled: any[]): Promise<void> {
    try {
      await this.adminClient.dbCreate('analytics_events', {
        user_id: userId,
        event_type: 'task_rescheduled',
        event_data: {
          count: rescheduled.length,
          tasks: rescheduled.map((r) => r.taskId),
        },
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(`Error logging reschedule event: ${error.message}`);
    }
  }
}