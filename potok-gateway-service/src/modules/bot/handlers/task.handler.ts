// potok-gateway-service/src/modules/bot/handlers/task.handler.ts
import { Injectable, Logger } from '@nestjs/common';
import { MessageSender } from '../services/message-sender.service';
import { UserManager } from '../services/user-manager.service';
import { ServiceIntegration } from '../services/service-integration.service';
import { InlineKeyboard } from '../bot.service';
import { MlTaskGenerationHandler } from './ml-task-generation.handler';
import { ScreenManager } from '../services/screen-manager.service';
import { DurationParser } from '../../../common/utils/duration-parser';

interface TaskDraft {
  title?: string;
  description?: string;
  priority?: string;
  complexity?: string;
  deadline?: string;
  estimated_duration?: number;
  required_energy?: number;
  required_focus?: number;
}

interface WorkSession {
  id: string;
  user_id: string;
  task_id: string;
  session_type: 'deepwork' | 'pomodoro' | 'focus';
  start_time: string;
  planned_duration: number;
  actual_end_time?: string;
  completed: boolean;
  interruptions?: number;
  focus_rating?: number;
  completion_notes?: string;
}

@Injectable()
export class TaskHandler {
  private readonly logger = new Logger(TaskHandler.name);
  private activeTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    private readonly messageSender: MessageSender,
    private readonly userManager: UserManager,
    private readonly serviceIntegration: ServiceIntegration,
    private readonly mlTaskHandler: MlTaskGenerationHandler,
    private readonly screenManager: ScreenManager,
  ) { }

  async handleCallback(maxUserId: string, params: string[]): Promise<void> {
    const action = params[0];

    switch (action) {
      case 'list':
        // НОВОЕ: поддержка пагинации
        if (params[1] === 'page' && params[2]) {
          const page = parseInt(params[2], 10);
          await this.showTaskList(maxUserId, page);
        } else {
          await this.showTaskList(maxUserId, 0);
        }
        break;
      case 'add':
        await this.startAddTask(maxUserId);
        break;
      case 'manual_input':
        await this.startManualInput(maxUserId);
        break;
      case 'start':
        await this.startTask(maxUserId, params[1]);
        break;
      case 'pause':
        await this.pauseTask(maxUserId, params[1]);
        break;
      case 'edit':
        if (params[1]) {
          // Первый раз - forceReload = true
          await this.startEditTask(maxUserId, params[1], true);
        }
        break;
      case 'resume':
        await this.resumeTask(maxUserId, params[1]);
        break;
      case 'force_resume':
        await this.forceResumeTask(maxUserId, params[1]);
        break;
      case 'complete':
        await this.completeTask(maxUserId, params[1]);
        break;
      case 'delete':
        if (params[1]) {
          await this.handleDeleteTask(maxUserId, params[1]);
        }
        break;
      case 'cancel_task':
        await this.cancelTask(maxUserId, params[1]);
        break;
      case 'rate':
        await this.rateSession(maxUserId, params[1], parseInt(params[2], 10));
        break;
      case 'clear_session':
        await this.clearActiveSession(maxUserId, params[1]);
        break;
      case 'reprioritize':
        await this.reprioritizeTasks(maxUserId);
        break;
      case 'reschedule':
        await this.rescheduleTasks(maxUserId);
        break;
      case 'priority':
        await this.handlePrioritySelection(maxUserId, params[1]);
        break;
      case 'complexity':
        await this.handleComplexitySelection(maxUserId, params[1]);
        break;
      case 'deadline':
        await this.handleDeadlineSelection(maxUserId, params[1]);
        break;
      case 'duration':
        await this.handleDurationSelection(maxUserId, params[1]);
        break;
      case 'confirm':
        await this.confirmTask(maxUserId);
        break;
      case 'edit_field':
        if (params[1]) {
          await this.handleEditField(maxUserId, params[1]);
        }
        break;
      case 'edit_preview':
        if (params[1]) {
          await this.handleEditPreviewField(maxUserId, params[1]);
        }
        break;

      case 'update_priority':
        if (params[1]) {
          const draft = await this.getTaskDraft(maxUserId);
          draft.priority = params[1];
          await this.saveTaskDraft(maxUserId, draft);

          const editingTaskId = await this.userManager.getUserState(`${maxUserId}:editing_task_id`);
          // НЕ перезагружаем из БД!
          await this.startEditTask(maxUserId, editingTaskId || "", false);
        }
        break;

      case 'update_complexity':
        if (params[1]) {
          const draft = await this.getTaskDraft(maxUserId);
          draft.complexity = params[1];
          await this.saveTaskDraft(maxUserId, draft);

          const editingTaskId = await this.userManager.getUserState(`${maxUserId}:editing_task_id`);
          // НЕ перезагружаем из БД!
          await this.startEditTask(maxUserId, editingTaskId || "", false);
        }
        break;
      case 'update_preview_priority':
        if (params[1]) {
          const draft = await this.getTaskDraft(maxUserId);
          draft.priority = params[1];
          await this.saveTaskDraft(maxUserId, draft);
          await this.showTaskPreview(maxUserId, draft);
        }
        break;

      case 'update_preview_complexity':
        if (params[1]) {
          const draft = await this.getTaskDraft(maxUserId);
          draft.complexity = params[1];

          // Обновляем energy и focus
          switch (params[1]) {
            case 'high':
              draft.required_energy = 8;
              draft.required_focus = 80;
              break;
            case 'medium':
              draft.required_energy = 6;
              draft.required_focus = 60;
              break;
            case 'low':
              draft.required_energy = 4;
              draft.required_focus = 40;
              break;
          }

          await this.saveTaskDraft(maxUserId, draft);
          await this.showTaskPreview(maxUserId, draft);
        }
        break;

      case 'update_preview_deadline':
        if (params[1]) {
          const draft = await this.getTaskDraft(maxUserId);

          if (params[1] === 'skip') {
            draft.deadline = undefined;
          } else if (params[1] === 'tomorrow') {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            draft.deadline = tomorrow.toISOString();
          } else if (params[1] === 'week') {
            const nextWeek = new Date();
            nextWeek.setDate(nextWeek.getDate() + 7);
            draft.deadline = nextWeek.toISOString();
          }

          await this.saveTaskDraft(maxUserId, draft);
          await this.showTaskPreview(maxUserId, draft);
        }
        break;

      case 'update_preview_duration':
        if (params[1]) {
          const draft = await this.getTaskDraft(maxUserId);
          draft.estimated_duration = parseInt(params[1], 10);
          await this.saveTaskDraft(maxUserId, draft);
          await this.showTaskPreview(maxUserId, draft);
        }
        break;

      case 'back_to_preview':
        const draft = await this.getTaskDraft(maxUserId);
        await this.showTaskPreview(maxUserId, draft);
        break;

      case 'update_deadline':
        if (params[1]) {
          const draft = await this.getTaskDraft(maxUserId);

          if (params[1] === 'skip') {
            draft.deadline = undefined;
          } else if (params[1] === 'tomorrow') {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            draft.deadline = tomorrow.toISOString();
          } else if (params[1] === 'week') {
            const nextWeek = new Date();
            nextWeek.setDate(nextWeek.getDate() + 7);
            draft.deadline = nextWeek.toISOString();
          }

          await this.saveTaskDraft(maxUserId, draft);

          const editingTaskId = await this.userManager.getUserState(`${maxUserId}:editing_task_id`);
          await this.startEditTask(maxUserId, editingTaskId || "", false);
        }
        break;

      case 'update_duration':
        if (params[1]) {
          const draft = await this.getTaskDraft(maxUserId);
          draft.estimated_duration = parseInt(params[1], 10);
          await this.saveTaskDraft(maxUserId, draft);

          const editingTaskId = await this.userManager.getUserState(`${maxUserId}:editing_task_id`);
          await this.startEditTask(maxUserId, editingTaskId || "", false);
        }
        break;

      case 'save_edit':
        await this.saveEditedTask(maxUserId);
        break;

      case 'manual_duration':
        await this.handleManualDuration(maxUserId);
        break;
      case 'confirm_delete':
        if (params[1]) {
          await this.serviceIntegration.cancelTask(params[1]);
          await this.messageSender.showScreen(maxUserId, '✅ Задача удалена');
          await this.showTaskList(maxUserId);
        }
        break;
      default:
        this.logger.warn(`Unknown task action: ${action}`);
    }
  }
  // ==================== РЕАЛИЗАЦИЯ СТАРТА ЗАДАЧИ ====================
  private async startTask(maxUserId: string, taskId: string): Promise<void> {
    const user = await this.userManager.getUserByMaxId(maxUserId);
    if (!user) {
      await this.messageSender.showScreen(maxUserId, '❌ Пользователь не найден');
      return;
    }

    try {
      this.logger.log(`Starting task ${taskId} for user ${user.id}`);

      const task = await this.serviceIntegration.getTask(taskId);
      if (!task) {
        await this.messageSender.showScreen(maxUserId, '❌ Задача не найдена');
        return;
      }

      const activeSession = await this.serviceIntegration.getActiveSession(user.id);
      if (activeSession) {
        // ИЗМЕНЕНО: Проверяем, это та же задача или другая
        if (activeSession.task_id === taskId) {
          // Это та же задача - возобновляем (как resume)
          this.logger.log(`Resuming existing session ${activeSession.session_id}`);
          await this.resumeTask(maxUserId, taskId);
          return;
        } else {
          // Другая задача - сообщаем об ошибке и предлагаем перейти
          const activeTask = await this.serviceIntegration.getTask(activeSession.task_id);

          let message = '⚠️ У вас уже есть активная задача. Завершите её перед началом новой.\n\n';

          if (activeTask) {
            message += `📋 **Активная задача:**\n${activeTask.title}\n`;
          }

          const keyboard: InlineKeyboard = {
            type: 'inline_keyboard',
            payload: {
              buttons: [
                [
                  { type: 'callback', text: '➡️ Перейти к активной задаче', payload: `task:start:${activeSession.task_id}` },
                ],
                [
                  { type: 'callback', text: '🗑️ Удалить активную сессию', payload: `task:clear_session:${activeSession.task_id}` },
                ],
                [
                  { type: 'callback', text: '📋 Все задачи', payload: 'task:list' },
                  { type: 'callback', text: '↩️ Главное меню', payload: 'menu:main' },
                ],
              ],
            },
          };

          await this.messageSender.showScreen(maxUserId, message, keyboard);
          return;
        }
      }

      const state = await this.serviceIntegration.getCurrentState(user.id);
      this.logger.debug(`User state: energy=${state.energy}, focus=${state.focus}`);

      const workMode = this.determineWorkMode(state);
      const sessionType = this.getSessionType(workMode, task);
      const duration = this.getSessionDuration(workMode, task);

      this.logger.log(`Work mode: ${workMode}, Session type: ${sessionType}, Duration: ${duration} min`);

      const session = await this.serviceIntegration.createWorkSession(user.id, {
        task_id: taskId,
        session_type: sessionType,
        start_time: new Date().toISOString(),
        planned_duration: duration,
        completed: false,
        interruptions: 0,
      });

      this.logger.log(`Work session created: ${session.id}`);

      await this.serviceIntegration.updateTask(taskId, {
        status: 'in_progress',
        started_at: new Date().toISOString(),
      });

      this.logger.log(`Task status updated to in_progress`);

      try {
        await this.serviceIntegration.sendWebSocketEvent(user.id, 'task_started', {
          taskId: task.id,
          sessionId: session.id,
          startTime: new Date().toISOString(),
          sessionType: sessionType,
          workMode: workMode,
          duration: duration,
        });
      } catch (error) {
        this.logger.warn(`Failed to send WebSocket event: ${error.message}`);
      }

      await this.serviceIntegration.createAnalyticsEvent(user.id, {
        event_type: 'focus_session_started',
        event_data: {
          task_id: taskId,
          session_id: session.id,
          session_type: sessionType,
          work_mode: workMode,
          planned_duration: duration,
        },
      });

      this.logger.log(`Analytics event created`);

      await this.serviceIntegration.setActiveSession(user.id, {
        id: session.id,
        session_id: session.id,
        task_id: taskId,
        start_time: new Date().toISOString(),
        planned_end: new Date(Date.now() + duration * 60 * 1000).toISOString(),
        planned_duration: duration,
        work_mode: workMode,
        session_type: sessionType,
      });

      this.logger.log(`Active session cached in Redis`);

      const messageId = await this.showActiveTaskScreen(maxUserId, task, session, workMode, duration);

      this.startProgressUpdates(maxUserId, user.id, taskId, session.id, duration, 0, messageId);

      this.logger.log(`✅ Task ${taskId} started successfully`);
    } catch (error) {
      this.logger.error(`Error starting task: ${error.message}`, error.stack);
      await this.messageSender.showScreen(
        maxUserId,
        '❌ Ошибка при запуске задачи. Попробуйте позже.',
      );
    }
  }

  private async forceResumeTask(maxUserId: string, taskId: string): Promise<void> {
    const user = await this.userManager.getUserByMaxId(maxUserId);
    if (!user) return;

    try {
      // Продолжаем несмотря на истекшее время
      const activeSession = await this.serviceIntegration.getActiveSession(user.id);
      if (!activeSession) {
        await this.messageSender.showScreen(maxUserId, '❌ Активная сессия не найдена');
        return;
      }

      const sessionId = activeSession.id || activeSession.session_id;
      const task = await this.serviceIntegration.getTask(taskId);
      if (!task) {
        await this.messageSender.showScreen(maxUserId, '❌ Задача не найдена');
        return;
      }

      // Определяем короткий цикл (15 минут)
      const state = await this.serviceIntegration.getCurrentState(user.id);
      const workMode = this.determineWorkMode(state);
      const forceDuration = 15; // принудительно 15 минут

      await this.serviceIntegration.setActiveSession(user.id, {
        id: sessionId,
        session_id: sessionId,
        task_id: taskId,
        start_time: activeSession.start_time,
        cycle_start_time: new Date().toISOString(),
        planned_duration: forceDuration,
        work_mode: workMode,
        session_type: 'focus',
      });

      const messageId = await this.showActiveTaskScreen(
        maxUserId,
        task,
        {
          ...activeSession,
          planned_duration: forceDuration,
        } as any,
        workMode,
        forceDuration
      );

      this.startProgressUpdates(
        maxUserId,
        user.id,
        taskId,
        sessionId,
        forceDuration,
        0,
        messageId
      );

      this.logger.log(`✅ Task ${taskId} force-resumed with ${forceDuration} min cycle`);
    } catch (error) {
      this.logger.error(`Error force-resuming task: ${error.message}`);
      await this.messageSender.showScreen(maxUserId, '❌ Ошибка при продолжении задачи');
    }
  }

  // ==================== ОПРЕДЕЛЕНИЕ РЕЖИМА РАБОТЫ ====================

  private determineWorkMode(state: any): 'PEAK' | 'NORMAL' | 'LOW' | 'CRITICAL' {
    const energy = state.energy || 5;
    const focus = state.focus || 50;

    if (energy >= 8 && focus >= 80) return 'PEAK';
    if (energy >= 5 && focus >= 60) return 'NORMAL';
    if (energy >= 3 && focus >= 40) return 'LOW';
    return 'CRITICAL';
  }

  private getSessionType(
    workMode: 'PEAK' | 'NORMAL' | 'LOW' | 'CRITICAL',
    task: any,
  ): 'deepwork' | 'pomodoro' | 'focus' {
    if (workMode === 'PEAK' && task.complexity === 'high') return 'deepwork';
    if (workMode === 'NORMAL') return 'pomodoro';
    return 'focus';
  }

  private getSessionDuration(
    workMode: 'PEAK' | 'NORMAL' | 'LOW' | 'CRITICAL',
    task: any,
  ): number {
    const taskDuration = task.estimated_duration || 60;

    switch (workMode) {
      case 'PEAK':
        return Math.min(90, taskDuration); // Deep Work: до 90 минут
      case 'NORMAL':
        return 25; // Pomodoro: 25 минут
      case 'LOW':
        return 15; // Короткие сессии: 15 минут
      case 'CRITICAL':
        return 10; // Очень короткие: 10 минут
      default:
        return 25;
    }
  }

  // ==================== ОТОБРАЖЕНИЕ АКТИВНОЙ ЗАДАЧИ ====================

  private async showActiveTaskScreen(
    maxUserId: string,
    task: any,
    session: WorkSession,
    workMode: string,
    duration: number,
  ): Promise<string> {
    const emoji = this.getWorkModeEmoji(workMode);
    const modeName = this.getWorkModeName(workMode);
    const instructions = this.getWorkModeInstructions(workMode);

    const minutes = Math.floor(duration);
    const seconds = 0;
    const timeDisplay = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    const totalDuration = session.planned_duration || duration;
    const elapsed = totalDuration - duration;
    const progress = Math.floor((elapsed / totalDuration) * 100);
    const progressBar = this.generateProgressBar(progress);

    const text = `
  📋 **${task.title}**
  
  ${task.description ? task.description + '\n' : ''}
  
  ⏱️ **${timeDisplay}**
  
  ${emoji} **${modeName}**
  ${instructions}
  
  ${this.getMotivationalMessage(workMode)}
  
  ${progressBar} ${progress}%
  `;

    const keyboard: InlineKeyboard = {
      type: 'inline_keyboard',
      payload: {
        buttons: [
          [{ type: 'callback', text: '⏸️ Пауза', payload: `task:pause:${task.id}` }],
          [{ type: 'callback', text: '✅ Завершить', payload: `task:complete:${task.id}` }],
          [{ type: 'callback', text: '❌ Отменить', payload: `task:canceltask:${task.id}` }],
        ],
      },
    };

    // ИСПРАВЛЕНО: убрали messageId из options
    const result = await this.messageSender.showScreen(maxUserId, text, keyboard);
    return result.messageId;
  }

  // ==================== ПЕРИОДИЧЕСКИЕ ОБНОВЛЕНИЯ ПРОГРЕССА ====================

  private startProgressUpdates(
    maxUserId: string,
    userId: string,
    taskId: string,
    sessionId: string,
    totalDuration: number,
    initialElapsed: number = 0,
    initialMessageId?: string, // ID сообщения с задачей
  ): void {
    // Проверить и удалить существующий таймер
    const existingTimer = this.activeTimers.get(sessionId);
    if (existingTimer) {
      this.logger.warn(`Clearing existing timer for session ${sessionId}`);
      clearInterval(existingTimer);
      this.activeTimers.delete(sessionId);
    }

    const startTime = Date.now() - (initialElapsed * 60000);
    const updateInterval = 30 * 1000; // 30 секунд для тестирования

    let currentMessageId = initialMessageId;

    const timerId = setInterval(async () => {
      try {
        const elapsed = Math.floor((Date.now() - startTime) / 60000);
        const remaining = totalDuration - elapsed;

        if (remaining <= 0) {
          clearInterval(timerId);
          this.activeTimers.delete(sessionId);
          await this.handleSessionTimeout(maxUserId, userId, taskId, sessionId);
          return;
        }

        // Получаем актуальные данные задачи и сессии
        const task = await this.serviceIntegration.getTask(taskId);
        const session = await this.serviceIntegration.getActiveSession(userId);

        if (!task || !session) {
          clearInterval(timerId);
          this.activeTimers.delete(sessionId);
          return;
        }

        // Обновляем прогресс в текущем сообщении
        currentMessageId = await this.showActiveTaskScreen(
          maxUserId,
          task,
          session,
          session.work_mode || 'NORMAL',
          remaining,
        );

        await this.serviceIntegration.sendWebSocketEvent(userId, 'task_progress', {
          taskId,
          sessionId,
          elapsed,
          remaining,
          progress: Math.floor((elapsed / totalDuration) * 100),
        });
      } catch (error) {
        this.logger.error(`Error sending progress update: ${error.message}`);
      }
    }, updateInterval);

    this.activeTimers.set(sessionId, timerId);
    this.logger.log(`✅ Progress timer started for session ${sessionId} (interval: ${updateInterval}ms)`);
  }

  private async handleSessionTimeout(
    maxUserId: string,
    userId: string,
    taskId: string,
    sessionId: string,
  ): Promise<void> {
    const text = `
⏰ **Время сессии истекло!**

Отличная работа! Пора сделать перерыв.

Оцените, насколько вы были сфокусированы:
`;

    const keyboard: InlineKeyboard = {
      type: 'inline_keyboard',
      payload: {
        buttons: [
          [
            { type: 'callback', text: '⭐', payload: `task:rate:${taskId}:1` },
            { type: 'callback', text: '⭐⭐', payload: `task:rate:${taskId}:2` },
            { type: 'callback', text: '⭐⭐⭐', payload: `task:rate:${taskId}:3` },
          ],
          [
            { type: 'callback', text: '⭐⭐⭐⭐', payload: `task:rate:${taskId}:4` },
            { type: 'callback', text: '⭐⭐⭐⭐⭐', payload: `task:rate:${taskId}:5` },
          ],
          [{ type: 'callback', text: '✅ Завершить задачу', payload: `task:complete:${taskId}` }],
        ],
      },
    };

    await this.messageSender.showScreen(maxUserId, text, keyboard);
  }
  // ==================== УПРАВЛЕНИЕ ЗАДАЧАМИ ====================

  private async pauseTask(maxUserId: string, taskId: string): Promise<void> {
    const user = await this.userManager.getUserByMaxId(maxUserId);
    if (!user) return;

    try {
      const activeSession = await this.serviceIntegration.getActiveSession(user.id);

      if (!activeSession) {
        this.logger.error(`❌ No active session found for user ${user.id}`);
        await this.messageSender.showScreen(maxUserId, '❌ Активная сессия не найдена');
        return;
      }

      // Проверяем, это та же задача или другая
      if (activeSession.task_id !== taskId) {
        this.logger.error(`❌ Session task_id mismatch: ${activeSession.task_id} != ${taskId}`);

        // Показываем сообщение и кнопку для перехода к активной задаче
        const activeTask = await this.serviceIntegration.getTask(activeSession.task_id);

        let message = '⚠️ Вы пытаетесь поставить на паузу неактивную задачу.\n\n';

        if (activeTask) {
          message += `📋 **Активная задача:**\n${activeTask.title}\n`;
        }

        const keyboard: InlineKeyboard = {
          type: 'inline_keyboard',
          payload: {
            buttons: [
              [
                { type: 'callback', text: '➡️ Перейти к активной задаче', payload: `task:start:${activeSession.task_id}` },
              ],
              [
                { type: 'callback', text: '🗑️ Удалить активную сессию', payload: `task:clear_session:${activeSession.task_id}` },
              ],
              [
                { type: 'callback', text: '📋 Все задачи', payload: 'task:list' },
                { type: 'callback', text: '↩️ Главное меню', payload: 'menu:main' },
              ],
            ],
          },
        };

        await this.messageSender.showScreen(maxUserId, message, keyboard);
        return;
      }

      // Если это та же задача — продолжаем паузу
      const sessionId = activeSession.id || activeSession.session_id;

      const timerId = this.activeTimers.get(sessionId);
      if (timerId) {
        clearInterval(timerId);
        this.activeTimers.delete(sessionId);
      }

      await this.serviceIntegration.addSessionInterruption(sessionId);

      await this.serviceIntegration.setActiveSession(user.id, {
        ...activeSession,
        paused: true,
        pause_time: new Date().toISOString(),
      });

      const text = `
  ⏸️ **Задача приостановлена**
  
  Сделайте перерыв, когда будете готовы - нажмите "Продолжить".
  
  ⚠️ Сессия остается активной. Таймер остановлен.
  `;

      const keyboard: InlineKeyboard = {
        type: 'inline_keyboard',
        payload: {
          buttons: [
            [{ type: 'callback', text: '▶️ Продолжить', payload: `task:resume:${taskId}` }],
            [
              { type: 'callback', text: '✅ Завершить', payload: `task:complete:${taskId}` },
              { type: 'callback', text: '❌ Отменить', payload: `task:cancel_task:${taskId}` },
            ],
          ],
        },
      };

      await this.messageSender.showScreen(maxUserId, text, keyboard);
    } catch (error) {
      this.logger.error(`Error pausing task: ${error.message}`);
      await this.messageSender.showScreen(maxUserId, '❌ Ошибка при приостановке задачи');
    }
  }

  private async resumeTask(maxUserId: string, taskId: string): Promise<void> {
    const user = await this.userManager.getUserByMaxId(maxUserId);
    if (!user) return;

    try {
      const activeSession = await this.serviceIntegration.getActiveSession(user.id);

      if (!activeSession) {
        this.logger.error(`❌ No active session for user ${user.id}`);
        await this.messageSender.showScreen(maxUserId, '❌ Активная сессия не найдена');
        return;
      }

      if (activeSession.task_id !== taskId) {
        this.logger.error(`❌ Session task_id mismatch: ${activeSession.task_id} != ${taskId}`);

        // Показываем сообщение и кнопку для перехода к активной задаче
        const activeTask = await this.serviceIntegration.getTask(activeSession.task_id);

        let message = '⚠️ Вы пытаетесь возобновить неактивную задачу.\n\n';

        if (activeTask) {
          message += `📋 **Активная задача:**\n${activeTask.title}\n`;
        }

        const keyboard: InlineKeyboard = {
          type: 'inline_keyboard',
          payload: {
            buttons: [
              [
                { type: 'callback', text: '➡️ Перейти к активной задаче', payload: `task:start:${activeSession.task_id}` },
              ],
              [
                { type: 'callback', text: '🗑️ Удалить активную сессию', payload: `task:clear_session:${activeSession.task_id}` },
              ],
              [
                { type: 'callback', text: '📋 Все задачи', payload: 'task:list' },
                { type: 'callback', text: '↩️ Главное меню', payload: 'menu:main' },
              ],
            ],
          },
        };

        await this.messageSender.showScreen(maxUserId, message, keyboard);
        return;
      }

      const sessionId = activeSession.id || activeSession.session_id;

      this.logger.log(`📋 Active session data: ${JSON.stringify(activeSession, null, 2)}`);

      await this.messageSender.showScreen(maxUserId, '▶️ Возобновляем работу...');

      const task = await this.serviceIntegration.getTask(taskId);
      if (!task) {
        await this.messageSender.showScreen(maxUserId, '❌ Задача не найдена');
        return;
      }

      // ✅ ВАЖНО: Вычисляем общее потраченное время от НАЧАЛА задачи
      const taskStartTime = new Date(activeSession.start_time).getTime();
      const now = Date.now();
      const totalElapsed = Math.floor((now - taskStartTime) / 60000);
      const estimatedDuration = task.estimated_duration || 60;
      const remainingTotal = Math.max(0, estimatedDuration - totalElapsed);

      this.logger.log(`⏱️ Total time calculations:
        task_start_time: ${activeSession.start_time}
        total_elapsed: ${totalElapsed} min
        estimated_duration: ${estimatedDuration} min
        remaining_total: ${remainingTotal} min
      `);

      // Если времени не осталось — предлагаем завершить
      if (remainingTotal <= 0) {
        this.logger.log(`⏰ Task time exceeded`);

        const text = `
  ⏰ **Время выполнения задачи истекло!**
  
  Вы работали: ${totalElapsed} мин
  Планировалось: ${estimatedDuration} мин
  
  Рекомендуем завершить задачу.
  `;

        const keyboard: InlineKeyboard = {
          type: 'inline_keyboard',
          payload: {
            buttons: [
              [{ type: 'callback', text: '✅ Завершить задачу', payload: `task:complete:${taskId}` }],
              [{ type: 'callback', text: '▶️ Продолжить немного', payload: `task:force_resume:${taskId}` }],
              [{ type: 'callback', text: '↩️ Главное меню', payload: 'menu:main' }],
            ],
          },
        };

        await this.messageSender.showScreen(maxUserId, text, keyboard);
        return;
      }

      // Определяем длительность следующего цикла
      const state = await this.serviceIntegration.getCurrentState(user.id);
      const workMode = this.determineWorkMode(state);
      const sessionType = this.getSessionType(workMode, task);
      const idealDuration = this.getSessionDuration(workMode, task);

      // Берем минимум из идеальной длительности и оставшегося времени
      const nextCycleDuration = Math.min(idealDuration, remainingTotal);

      this.logger.log(`📊 Next cycle: ${nextCycleDuration} min (ideal: ${idealDuration}, remaining: ${remainingTotal})`);

      // Обновляем кеш — сохраняем ИСХОДНОЕ start_time задачи
      await this.serviceIntegration.setActiveSession(user.id, {
        id: sessionId,
        session_id: sessionId,
        task_id: taskId,
        start_time: activeSession.start_time, // ✅ ИСХОДНОЕ время старта задачи
        cycle_start_time: new Date().toISOString(), // время старта текущего цикла
        planned_duration: nextCycleDuration,
        total_elapsed: totalElapsed, // общее потраченное время
        work_mode: workMode,
        session_type: sessionType,
      });

      // Показываем экран активной задачи
      const messageId = await this.showActiveTaskScreen(
        maxUserId,
        task,
        {
          ...activeSession,
          planned_duration: nextCycleDuration,
        } as any,
        workMode,
        nextCycleDuration
      );

      // Перезапускаем таймер прогресса для нового цикла
      this.startProgressUpdates(
        maxUserId,
        user.id,
        taskId,
        sessionId,
        nextCycleDuration, // длительность ЦИКЛА, а не общей задачи
        0, // новый цикл начинается с 0
        messageId
      );

      this.logger.log(`✅ Task ${taskId} resumed with new ${nextCycleDuration} min cycle (total remaining: ${remainingTotal} min)`);

    } catch (error) {
      this.logger.error(`❌ Error resuming task: ${error.message}`, error.stack);
      await this.messageSender.showScreen(maxUserId, '❌ Ошибка при возобновлении задачи');
    }
  }




  private async completeTask(maxUserId: string, taskId: string): Promise<void> {
    const user = await this.userManager.getUserByMaxId(maxUserId);
    if (!user) return;

    try {
      const activeSession = await this.serviceIntegration.getActiveSession(user.id);

      if (activeSession && activeSession.task_id !== taskId) {
        // как у тебя сейчас — показываем, что задача другая и выходим
        const activeTask = await this.serviceIntegration.getTask(activeSession.task_id);
        let message = '⚠️ Вы пытаетесь завершить неактивную задачу.\n\n';
        if (activeTask) {
          message += `📋 **Активная задача:**\n${activeTask.title}\n`;
        }

        const keyboard: InlineKeyboard = {
          type: 'inline_keyboard',
          payload: {
            buttons: [
              [{ type: 'callback', text: '➡️ Перейти к активной задаче', payload: `task:start:${activeSession.task_id}` }],
              [{ type: 'callback', text: '🗑️ Удалить активную сессию', payload: `task:clear_session:${activeSession.task_id}` }],
              [
                { type: 'callback', text: '📋 Все задачи', payload: 'task:list' },
                { type: 'callback', text: '↩️ Главное меню', payload: 'menu:main' },
              ],
            ],
          },
        };

        await this.messageSender.showScreen(maxUserId, message, keyboard);
        return;
      }

      // 🔹 1. Если есть активная сессия по этой задаче — завершаем её в admin-service
      let sessionId: string | null = null;

      if (activeSession) {
        sessionId = activeSession.id || activeSession.session_id;

        // Остановить таймер прогресса для этой сессии
        const timerId = this.activeTimers.get(sessionId || "");
        if (timerId) {
          clearInterval(timerId);
          this.activeTimers.delete(sessionId || "");
        }

        // Завершаем work-session в БД (actual_end_time + completed = true)
        await this.serviceIntegration.completeWorkSession(sessionId || "", {
          // сюда можно позже добавить focus_rating / completion_notes при необходимости
        });
      }

      // 🔹 2. Обновить статус задачи
      await this.serviceIntegration.updateTask(taskId, {
        status: 'completed',
        completed_at: new Date().toISOString(),
      });

      // 🔹 3. Очистить активную сессию в Redis
      await this.serviceIntegration.clearActiveSession(user.id);

      // 🔹 4. WebSocket событие
      await this.serviceIntegration.sendWebSocketEvent(user.id, 'task_completed', {
        taskId,
        completedAt: new Date().toISOString(),
      });

      // 🔹 5. Аналитика (если сессия была — кладём её id)
      await this.serviceIntegration.createAnalyticsEvent(user.id, {
        event_type: 'task_completed',
        event_data: {
          task_id: taskId,
          session_id: sessionId,
        },
      });

      const text = `
  🎉 **Отлично! Задача завершена!**
  
  Вы молодец! 💪
  Что дальше?
  `;
      const keyboard: InlineKeyboard = {
        type: 'inline_keyboard',
        payload: {
          buttons: [
            [
              { type: 'callback', text: '🎯 Показать MIT', payload: 'mit:show' },
              { type: 'callback', text: '📋 Все задачи', payload: 'task:list' },
            ],
            [{ type: 'callback', text: '↩️ Главное меню', payload: 'menu:main' }],
          ],
        },
      };

      await this.messageSender.showScreen(maxUserId, text, keyboard);
    } catch (error) {
      this.logger.error(`Error completing task: ${error.message}`);
      await this.messageSender.showScreen(maxUserId, '❌ Ошибка при завершении задачи');
    }
  }

  private async cancelTask(maxUserId: string, taskId: string): Promise<void> {
    const user = await this.userManager.getUserByMaxId(maxUserId);
    if (!user) return;

    try {
      const activeSession = await this.serviceIntegration.getActiveSession(user.id);

      if (activeSession && activeSession.task_id !== taskId) {
        this.logger.error(`❌ Session task_id mismatch: ${activeSession.task_id} != ${taskId}`);

        // Показываем сообщение и кнопку для перехода к активной задаче
        const activeTask = await this.serviceIntegration.getTask(activeSession.task_id);

        let message = '⚠️ Вы пытаетесь завершить неактивную задачу.\n\n';

        if (activeTask) {
          message += `📋 **Активная задача:**\n${activeTask.title}\n`;
        }

        const keyboard: InlineKeyboard = {
          type: 'inline_keyboard',
          payload: {
            buttons: [
              [
                { type: 'callback', text: '➡️ Перейти к активной задаче', payload: `task:start:${activeSession.task_id}` },
              ],
              [
                { type: 'callback', text: '🗑️ Удалить активную сессию', payload: `task:clear_session:${activeSession.task_id}` },
              ],
              [
                { type: 'callback', text: '📋 Все задачи', payload: 'task:list' },
                { type: 'callback', text: '↩️ Главное меню', payload: 'menu:main' },
              ],
            ],
          },
        };

        await this.messageSender.showScreen(maxUserId, message, keyboard);
        return;
      }

      // Вернуть статус задачи в pending
      await this.serviceIntegration.updateTask(taskId, {
        status: 'pending',
      });

      // Очистить активную сессию
      await this.serviceIntegration.clearActiveSession(user.id);

      // WebSocket событие
      await this.serviceIntegration.sendWebSocketEvent(user.id, 'task_cancelled', {
        taskId,
      });

      await this.messageSender.showScreen(
        maxUserId,
        '❌ Задача отменена. Статус возвращен в "Ожидание".',
      );
    } catch (error) {
      this.logger.error(`Error canceling task: ${error.message}`);
      await this.messageSender.showScreen(maxUserId, '❌ Ошибка при отмене задачи');
    }
  }

  private async clearActiveSession(maxUserId: string, taskId: string): Promise<void> {
    const user = await this.userManager.getUserByMaxId(maxUserId);
    if (!user) return;

    try {
      const activeSession = await this.serviceIntegration.getActiveSession(user.id);

      if (!activeSession) {
        await this.messageSender.showScreen(maxUserId, '❌ Активная сессия не найдена');
        return;
      }

      if (activeSession.task_id !== taskId) {
        await this.messageSender.showScreen(maxUserId, '❌ Невозможно удалить сессию для этой задачи');
        return;
      }

      // Остановить таймер
      const sessionId = activeSession.id || activeSession.session_id;
      const timerId = this.activeTimers.get(sessionId);
      if (timerId) {
        clearInterval(timerId);
        this.activeTimers.delete(sessionId);
      }

      // Очистить активную сессию из Redis
      await this.serviceIntegration.clearActiveSession(user.id);

      // Отправить WebSocket-событие
      await this.serviceIntegration.sendWebSocketEvent(user.id, 'session_cleared', {
        taskId,
      });

      const text = '🗑️ Активная сессия удалена. Теперь можно запускать новую задачу.';

      const keyboard: InlineKeyboard = {
        type: 'inline_keyboard',
        payload: {
          buttons: [
            [
              { type: 'callback', text: '➕ Добавить задачу', payload: 'task:add' },
              { type: 'callback', text: '📋 Все задачи', payload: 'task:list' },
            ],
            [
              { type: 'callback', text: '🎯 MIT', payload: 'mit:show' },
              { type: 'callback', text: '↩️ Главное меню', payload: 'menu:main' },
            ],
          ],
        },
      };

      await this.messageSender.showScreen(maxUserId, text, keyboard);
    } catch (error) {
      this.logger.error(`Error clearing session: ${error.message}`);
      await this.messageSender.showScreen(maxUserId, '❌ Ошибка при удалении сессии');
    }
  }

  private async rateSession(maxUserId: string, taskId: string, rating: number): Promise<void> {
    const user = await this.userManager.getUserByMaxId(maxUserId);
    if (!user) return;

    try {
      const activeSession = await this.serviceIntegration.getActiveSession(user.id);

      if (activeSession) {
        const sessionId = activeSession.id || activeSession.session_id;

        await this.serviceIntegration.completeWorkSession(sessionId, {
          focus_rating: rating,
        });

        // Получаем информацию о задаче и сессии для расчета времени
        const task = await this.serviceIntegration.getTask(taskId);
        if (!task) {
          await this.messageSender.showScreen(maxUserId, '❌ Задача не найдена');
          return;
        }

        // Вычисляем общее потраченное время
        const startTime = new Date(activeSession.start_time).getTime();
        const now = Date.now();
        const totalElapsed = Math.floor((now - startTime) / 60000);
        const estimatedDuration = task.estimated_duration || 60;
        const remainingTotal = Math.max(0, estimatedDuration - totalElapsed);

        // Определяем, достаточно ли времени для продолжения
        const minSessionTime = 10; // минимальное время для новой сессии

        let text = `✅ Ваша оценка фокуса: ${rating}/5 ⭐\n\n`;

        if (remainingTotal < minSessionTime) {
          // Времени осталось мало — предлагаем только завершить
          text += `⏰ Осталось мало времени (${remainingTotal} мин).\nРекомендуем завершить задачу.\n\nЧто дальше?`;

          const keyboard: InlineKeyboard = {
            type: 'inline_keyboard',
            payload: {
              buttons: [
                [
                  { type: 'callback', text: '✅ Завершить задачу', payload: `task:complete:${taskId}` },
                ],
                [
                  { type: 'callback', text: '▶️ Продолжить еще немного', payload: `task:resume:${taskId}` },
                ],
                [{ type: 'callback', text: '↩️ Главное меню', payload: 'menu:main' }]
              ],
            },
          };

          await this.messageSender.showScreen(maxUserId, text, keyboard);
        } else {
          // Достаточно времени для продолжения
          text += `⏰ Осталось: ${remainingTotal} мин до завершения задачи.\n\nЧто дальше?`;

          const keyboard: InlineKeyboard = {
            type: 'inline_keyboard',
            payload: {
              buttons: [
                [
                  { type: 'callback', text: '▶️ Продолжить задачу', payload: `task:resume:${taskId}` },
                  { type: 'callback', text: '✅ Завершить задачу', payload: `task:complete:${taskId}` },
                ],
                [{ type: 'callback', text: '↩️ Главное меню', payload: 'menu:main' }]
              ],
            },
          };

          await this.messageSender.showScreen(maxUserId, text, keyboard);
        }
      }
    } catch (error) {
      this.logger.error(`Error rating session: ${error.message}`);
    }
  }


  // ==================== МЕТОДЫ РАБОТЫ С DRAFT ====================

  async handleTaskInput(maxUserId: string, text: string): Promise<void> {
    const draft: TaskDraft = { title: text };
    await this.saveTaskDraft(maxUserId, draft);
    await this.userManager.setUserState(maxUserId, 'awaiting_priority');
    await this.askPriority(maxUserId, draft);
  }

  async handleTaskDescriptionInput(maxUserId: string, text: string): Promise<void> {
    const draft = await this.getTaskDraft(maxUserId);
    draft.description = text;
    await this.saveTaskDraft(maxUserId, draft);
    await this.userManager.setUserState(maxUserId, 'awaiting_priority');
    await this.askPriority(maxUserId, draft);
  }

  async handleDeadlineInput(maxUserId: string, text: string): Promise<void> {
    const draft = await this.getTaskDraft(maxUserId);
    const parsedDate = this.parseDate(text);

    if (!parsedDate) {
      await this.messageSender.showScreen(
        maxUserId,
        '❌ Неверный формат даты. Используйте ДД.ММ.ГГГГ',
      );
      return;
    }

    draft.deadline = parsedDate.toISOString();
    await this.saveTaskDraft(maxUserId, draft);
    await this.userManager.setUserState(maxUserId, 'awaiting_duration');
    await this.askEstimatedDuration(maxUserId, draft);
  }

  private async handlePrioritySelection(maxUserId: string, priority: string): Promise<void> {
    const draft = await this.getTaskDraft(maxUserId);
    draft.priority = priority;
    await this.saveTaskDraft(maxUserId, draft);
    await this.userManager.setUserState(maxUserId, 'awaiting_complexity');
    await this.askComplexity(maxUserId, draft);
  }

  private async handleComplexitySelection(maxUserId: string, complexity: string): Promise<void> {
    const draft = await this.getTaskDraft(maxUserId);
    draft.complexity = complexity;

    switch (complexity) {
      case 'high':
        draft.required_energy = 8;
        draft.required_focus = 80;
        break;
      case 'medium':
        draft.required_energy = 6;
        draft.required_focus = 60;
        break;
      case 'low':
        draft.required_energy = 4;
        draft.required_focus = 40;
        break;
    }

    await this.saveTaskDraft(maxUserId, draft);
    await this.userManager.setUserState(maxUserId, 'awaiting_deadline');
    await this.askDeadline(maxUserId, draft);
  }

  private async handleDeadlineSelection(maxUserId: string, option: string): Promise<void> {
    const draft = await this.getTaskDraft(maxUserId);

    if (option === 'skip') {
      await this.userManager.setUserState(maxUserId, 'awaiting_duration');
      await this.askEstimatedDuration(maxUserId, draft);
      return;
    }

    let deadline: Date;
    const now = new Date();

    switch (option) {
      case 'tomorrow':
        deadline = new Date(now);
        deadline.setDate(deadline.getDate() + 1);
        break;
      case 'week':
        deadline = new Date(now);
        deadline.setDate(deadline.getDate() + 7);
        break;
      default:
        await this.userManager.setUserState(maxUserId, 'awaiting_duration');
        await this.askEstimatedDuration(maxUserId, draft);
        return;
    }

    draft.deadline = deadline.toISOString();
    await this.saveTaskDraft(maxUserId, draft);
    await this.userManager.setUserState(maxUserId, 'awaiting_duration');
    await this.askEstimatedDuration(maxUserId, draft);
  }

  private async handleDurationSelection(maxUserId: string, duration: string): Promise<void> {
    const draft = await this.getTaskDraft(maxUserId);
    draft.estimated_duration = parseInt(duration, 10);
    await this.saveTaskDraft(maxUserId, draft);
    await this.userManager.setUserState(maxUserId, 'awaiting_preview');
    await this.showTaskPreview(maxUserId, draft);
  }

  private async confirmTask(maxUserId: string): Promise<void> {
    const user = await this.userManager.getUserByMaxId(maxUserId);
    if (!user) return;

    const draft = await this.getTaskDraft(maxUserId);

    // ✅ Проверка наличия title
    if (!draft.title) {
      this.logger.error(`❌ Attempted to create task without title for user ${maxUserId}`);
      await this.messageSender.showScreen(
        maxUserId,
        '❌ Ошибка: не указано название задачи. Попробуйте создать задачу заново.',
      );
      await this.clearTaskDraft(maxUserId);
      await this.userManager.clearUserState(maxUserId);
      return;
    }

    try {
      await this.serviceIntegration.createTask(user.id, {
        title: draft.title,
        description: draft.description,
        priority: draft.priority || 'medium',
        complexity: draft.complexity || 'medium',
        deadline: draft.deadline,
        estimated_duration: draft.estimated_duration || 60,
        required_energy: draft.required_energy || 6,
        required_focus: draft.required_focus || 60,
      });

      // Очищаем черновик и состояние пользователя только после успешного создания
      await this.clearTaskDraft(maxUserId);
      await this.userManager.clearUserState(maxUserId);

      const keyboard: InlineKeyboard = {
        type: 'inline_keyboard',
        payload: {
          buttons: [
            [
              { type: 'callback', text: '➕ Добавить еще', payload: 'task:add' },
              { type: 'callback', text: '📋 Мои задачи', payload: 'task:list' },
            ],
            [{ type: 'callback', text: '↩️ Главное меню', payload: 'menu:main' }],
          ],
        },
      };

      await this.messageSender.showScreen(
        maxUserId,
        '✅ Задача успешно создана!',
        keyboard,
      );
    } catch (error) {
      this.logger.error(`Error confirming task: ${error.message}`);
      await this.messageSender.showScreen(
        maxUserId,
        '❌ Ошибка при создании задачи. Попробуйте позже.',
      );
    }
  }

  // ==================== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ====================

  private getWorkModeEmoji(workMode: string): string {
    const map = {
      PEAK: '🔥',
      NORMAL: '⚡',
      LOW: '🌙',
      CRITICAL: '😴',
    };
    return map[workMode] || '⚡';
  }

  private getWorkModeName(workMode: string): string {
    const map = {
      PEAK: 'Deep Work (Пиковая продуктивность)',
      NORMAL: 'Pomodoro (Нормальный режим)',
      LOW: 'Легкий фокус',
      CRITICAL: 'Отдых нужен',
    };
    return map[workMode] || 'Обычный';
  }

  private getWorkModeInstructions(workMode: string): string {
    const instructions = {
      PEAK: '🔕 Уведомления отключены\n📵 Отключите телефон\n🎧 Можно включить фоновую музыку',
      NORMAL: '🔔 Уведомления включены\n⏱️ 25 минут работы + 5 минут отдых\n💪 Сфокусируйтесь на задаче',
      LOW: '⏱️ 15 минут фокуса\n☕ Потом сделайте короткий перерыв\n🌙 Не перенапрягайтесь',
      CRITICAL: '⚠️ Рекомендуем сделать перерыв\n😴 Ваш уровень энергии низкий\n☕ Отдохните перед работой',
    };
    return instructions[workMode] || '';
  }

  private getMotivationalMessage(workMode: string): string {
    const messages = {
      PEAK: [
        'Это лучшее время для сложных задач!',
        'Ваша продуктивность на пике!',
        'Используйте этот момент максимально!',
      ],
      NORMAL: [
        'Отличное время для продуктивной работы',
        'Вы в хорошей форме!',
        'Держите темп!',
      ],
      LOW: [
        'Маленькими шагами к цели',
        'Даже небольшой прогресс — это прогресс',
        'Не торопитесь, делайте в своем темпе',
      ],
      CRITICAL: [
        'Отдохните сначала — потом будет легче',
        'Забота о себе — это важно',
        'Качественный отдых = качественная работа',
      ],
    };

    const modeMessages = messages[workMode] || messages.NORMAL;
    return modeMessages[Math.floor(Math.random() * modeMessages.length)];
  }

  private generateProgressBar(progress: number): string {
    const totalBlocks = 10;
    const filledBlocks = Math.floor((progress / 100) * totalBlocks);
    const emptyBlocks = totalBlocks - filledBlocks;

    return '[' + '█'.repeat(filledBlocks) + '░'.repeat(emptyBlocks) + ']';
  }
  // ==================== СУЩЕСТВУЮЩИЕ МЕТОДЫ (без изменений) ====================


  private async showTaskList(maxUserId: string, page: number = 0): Promise<void> {
    const user = await this.userManager.getUserByMaxId(maxUserId);
    if (!user) return;

    try {
      const TASKS_PER_PAGE = 3; // По 3 задачи на странице (меньше, чтобы не спамить)

      const tasksResponse = await this.serviceIntegration.getUserTasks(user.id);

      if (!tasksResponse || tasksResponse.length === 0) {
        const keyboard: InlineKeyboard = {
          type: 'inline_keyboard',
          payload: {
            buttons: [
              [{ type: 'callback', text: '➕ Добавить задачу', payload: 'task:add' }],
              [{ type: 'callback', text: '↩️ Главное меню', payload: 'menu:main' }],
            ],
          },
        };

        await this.messageSender.showScreen(
          maxUserId,
          '📋 У вас пока нет задач.\n\nСоздайте первую задачу!',
          keyboard,
        );
        return;
      }

      // Пагинация
      const totalPages = Math.ceil(tasksResponse.length / TASKS_PER_PAGE);
      const currentPage = Math.max(0, Math.min(page, totalPages - 1));
      const startIdx = currentPage * TASKS_PER_PAGE;
      const endIdx = startIdx + TASKS_PER_PAGE;
      const tasksOnPage = tasksResponse.slice(startIdx, endIdx);

      // НОВОЕ: Очищаем предыдущие сообщения перед отправкой новых
      await this.messageSender.clearScreenMessages(maxUserId);

      // Заголовок с навигацией
      const headerMessage = `📋 **Мои задачи** (${tasksResponse.length})\nСтраница ${currentPage + 1} из ${totalPages}`;

      const headerButtons: any[][] = [];

      // Кнопки навигации
      const navigationButtons: any[] = [];
      if (currentPage > 0) {
        navigationButtons.push({
          type: 'callback',
          text: '◀️ Назад',
          payload: `task:list:page:${currentPage - 1}`,
        });
      }
      if (currentPage < totalPages - 1) {
        navigationButtons.push({
          type: 'callback',
          text: 'Вперёд ▶️',
          payload: `task:list:page:${currentPage + 1}`,
        });
      }
      if (navigationButtons.length > 0) {
        headerButtons.push(navigationButtons);
      }

      headerButtons.push(
        [
          { type: 'callback', text: '➕ Добавить', payload: 'task:add' },
          { type: 'callback', text: '🎯 MIT', payload: 'mit:show' },
        ],
        [
          { type: 'callback', text: '🔄 Перепланировать', payload: 'task:reprioritize' },
        ],
        [
          { type: 'callback', text: '↩️ Главное меню', payload: 'menu:main' },
        ]
      );

      const headerKeyboard: InlineKeyboard = {
        type: 'inline_keyboard',
        payload: { buttons: headerButtons },
      };

      // Отправляем заголовок
      await this.messageSender.sendMessageAndTrack(maxUserId, headerMessage, headerKeyboard);

      // НОВОЕ: Отправляем каждую задачу отдельным сообщением с кнопками
      for (let i = 0; i < tasksOnPage.length; i++) {
        const taskItem = tasksOnPage[i];
        const task = taskItem.task || taskItem;
        const globalIndex = startIdx + i + 1;

        await this.sendTaskCard(maxUserId, task, globalIndex);
      }

    } catch (error) {
      this.logger.error(`Error showing task list: ${error.message}`, error.stack);

      await this.messageSender.showScreen(
        maxUserId,
        '❌ Ошибка при загрузке списка задач. Попробуйте позже.',
      );
    }
  }

  /**
   * 🎴 Отправить карточку задачи
   */
  private async sendTaskCard(maxUserId: string, task: any, index: number): Promise<void> {
    const emoji = this.getTaskEmoji(task.priority);
    const status = this.getStatusEmoji(task.status);

    // Формируем текст карточки
    let message = `${index}. ${emoji}${status} **${task.title}**\n\n`;

    if (task.description) {
      const shortDesc = task.description.length > 100
        ? task.description.substring(0, 100) + '...'
        : task.description;
      message += `📝 ${shortDesc}\n\n`;
    }

    if (task.deadline) {
      const deadlineDate = new Date(task.deadline);
      message += `📅 Дедлайн: ${this.formatDate(deadlineDate)}\n`;
    }

    if (task.estimated_duration) {
      const formattedDuration = DurationParser.format(task.estimated_duration);
      message += `⏱️ ${formattedDuration}\n`;
    }

    if (task.priority) {
      const priorityText = task.priority === 'high' ? 'Высокий' :
        task.priority === 'medium' ? 'Средний' : 'Низкий';
      message += `🔥 Приоритет: ${priorityText}\n`;
    }

    if (task.complexity) {
      const complexityText = task.complexity === 'high' ? 'Высокая' :
        task.complexity === 'medium' ? 'Средняя' : 'Низкая';
      message += `⚡ Сложность: ${complexityText}\n`;
    }

    // Кнопки управления задачей
    const buttons: any[][] = [];

    if (task.status === 'pending') {
      buttons.push([
        { type: 'callback', text: '▶️ Начать', payload: `task:start:${task.id}` },
        { type: 'callback', text: '✏️ Изменить', payload: `task:edit:${task.id}` },
      ]);
      buttons.push([
        { type: 'callback', text: '🗑️ Удалить', payload: `task:delete:${task.id}` },
      ]);
    } else if (task.status === 'in_progress') {
      buttons.push([
        { type: 'callback', text: '⏸️ Пауза', payload: `task:pause:${task.id}` },
        { type: 'callback', text: '✅ Завершить', payload: `task:complete:${task.id}` },
      ]);
      buttons.push([
        { type: 'callback', text: '❌ Отменить', payload: `task:canceltask:${task.id}` },
      ]);
    } else if (task.status === 'completed') {
      buttons.push([
        { type: 'callback', text: '🔄 Возобновить', payload: `task:reopen:${task.id}` },
        { type: 'callback', text: '🗑️ Удалить', payload: `task:delete:${task.id}` },
      ]);
    }

    const keyboard: InlineKeyboard = {
      type: 'inline_keyboard',
      payload: { buttons },
    };

    // ИСПРАВЛЕНО: используем sendMessageAndTrack для трекинга карточки
    await this.messageSender.sendMessageAndTrack(maxUserId, message, keyboard);
  }

  private async startAddTask(maxUserId: string): Promise<void> {
    const text = `
➕ **Добавление новой задачи**

Выберите способ создания задачи:
    `;

    const keyboard: InlineKeyboard = {
      type: 'inline_keyboard',
      payload: {
        buttons: [
          [
            {
              type: 'callback',
              text: '✏️ Ввести вручную',
              payload: 'task:manual_input'
            },
            {
              type: 'callback',
              text: '🤖 Сгенерировать с ИИ',
              payload: 'ml_gen:start'
            },
          ],
          [{ type: 'callback', text: '↩️ Отмена', payload: 'menu:main' }],
        ],
      },
    };

    await this.messageSender.showScreen(maxUserId, text, keyboard);
  }

  private async startManualInput(maxUserId: string): Promise<void> {
    const text = `
➕ **Ручное добавление задачи**

Отправьте название задачи. Например:
\`Подготовить презентацию для клиента\`
    `;

    const keyboard: InlineKeyboard = {
      type: 'inline_keyboard',
      payload: {
        buttons: [
          [{ type: 'callback', text: '↩️ Отмена', payload: 'menu:main' }],
        ],
      },
    };

    await this.messageSender.showScreen(maxUserId, text, keyboard);
    await this.userManager.setUserState(maxUserId, 'awaiting_task_input');
  }

  private async askPriority(maxUserId: string, draft: TaskDraft): Promise<void> {
    const message = `
📝 **Создание задачи**

✅ Название: **${draft.title}**
${draft.description ? `📄 Описание: ${draft.description}` : ''}

Выберите приоритет задачи:
`;

    const keyboard: InlineKeyboard = {
      type: 'inline_keyboard',
      payload: {
        buttons: [
          [
            { type: 'callback', text: '🔴 Высокий', payload: 'task:priority:high' },
            { type: 'callback', text: '🟡 Средний', payload: 'task:priority:medium' },
            { type: 'callback', text: '🟢 Низкий', payload: 'task:priority:low' },
          ],
          [{ type: 'callback', text: '❌ Отменить', payload: 'menu:main' }],
        ],
      },
    };

    await this.messageSender.showScreen(maxUserId, message, keyboard);
  }


  private async askComplexity(maxUserId: string, draft: TaskDraft): Promise<void> {
    const message = `
📝 **Создание задачи**

✅ Название: **${draft.title}**
${this.getPriorityEmoji(draft.priority || 'medium')} Приоритет: ${this.getPriorityText(draft.priority || 'medium')}

Выберите сложность задачи:
`;

    const keyboard: InlineKeyboard = {
      type: 'inline_keyboard',
      payload: {
        buttons: [
          [
            { type: 'callback', text: '🔥 Высокая', payload: 'task:complexity:high' },
            { type: 'callback', text: '⚡ Средняя', payload: 'task:complexity:medium' },
            { type: 'callback', text: '✨ Низкая', payload: 'task:complexity:low' },
          ],
          [{ type: 'callback', text: '❌ Отменить', payload: 'menu:main' }],
        ],
      },
    };

    await this.messageSender.showScreen(maxUserId, message, keyboard);
  }


  private async askDeadline(maxUserId: string, draft: TaskDraft): Promise<void> {
    const message = `
📝 **Создание задачи**

✅ Название: **${draft.title}**
${this.getPriorityEmoji(draft.priority || 'medium')} Приоритет: ${this.getPriorityText(draft.priority || 'medium')}
${this.getComplexityEmoji(draft.complexity || 'medium')} Сложность: ${this.getComplexityText(draft.complexity || 'medium')}

Укажите дедлайн (формат: ДД.ММ.ГГГГ):
Например: \`15.11.2025\`

Или пропустите, если дедлайна нет.
`;

    const keyboard: InlineKeyboard = {
      type: 'inline_keyboard',
      payload: {
        buttons: [
          [
            { type: 'callback', text: '📅 Завтра', payload: 'task:deadline:tomorrow' },
            { type: 'callback', text: '📅 Через неделю', payload: 'task:deadline:week' },
          ],
          [
            { type: 'callback', text: '⏭️ Пропустить', payload: 'task:deadline:skip' },
            { type: 'callback', text: '❌ Отменить', payload: 'menu:main' },
          ],
        ],
      },
    };

    await this.messageSender.showScreen(maxUserId, message, keyboard);
    await this.userManager.setUserState(maxUserId, 'awaiting_deadline');
  }


  private async askEstimatedDuration(maxUserId: string, draft: TaskDraft): Promise<void> {
    const message = `⏱️ **Укажите длительность**
  
  ${draft.title}
  ${this.getPriorityEmoji(draft.priority ?? 'medium')} ${this.getPriorityText(draft.priority ?? 'medium')}
  ${this.getComplexityEmoji(draft.complexity ?? 'medium')} ${this.getComplexityText(draft.complexity ?? 'medium')}
  ${draft.deadline ? `📅 ${this.formatDate(new Date(draft.deadline))}` : ''}
  
  ${DurationParser.getHints()}
  
  Выберите или введите вручную:`;

    const keyboard: InlineKeyboard = {
      type: 'inline_keyboard',
      payload: {
        buttons: [
          [
            { type: 'callback', text: '15 мин', payload: 'task:duration:15' },
            { type: 'callback', text: '30 мин', payload: 'task:duration:30' },
            { type: 'callback', text: '1 час', payload: 'task:duration:60' },
          ],
          [
            { type: 'callback', text: '2 часа', payload: 'task:duration:120' },
            { type: 'callback', text: '4 часа', payload: 'task:duration:240' },
          ],
          [
            { type: 'callback', text: '1 день', payload: 'task:duration:1440' },
            { type: 'callback', text: '3 дня', payload: 'task:duration:4320' },
          ],
          [
            { type: 'callback', text: '1 неделя', payload: 'task:duration:10080' },
            { type: 'callback', text: '1 месяц', payload: 'task:duration:43200' },
          ],
          [
            { type: 'callback', text: '✏️ Ввести вручную', payload: 'task:manual_duration' },
          ],
          [
            { type: 'callback', text: '❌ Отмена', payload: 'menu:main' },
          ],
        ],
      },
    };

    await this.messageSender.showScreen(maxUserId, message, keyboard);
  }




  private async showTaskPreview(maxUserId: string, draft: TaskDraft): Promise<void> {
    const message = `📋 **Предпросмотр задачи**\n\n` +
      `📝 **Название:** ${draft.title}\n` +
      (draft.description ? `📄 **Описание:** ${draft.description}\n` : '') +
      `${this.getPriorityEmoji(draft.priority ?? 'medium')} **Приоритет:** ${this.getPriorityText(draft.priority ?? 'medium')}\n` +
      `${this.getComplexityEmoji(draft.complexity ?? 'medium')} **Сложность:** ${this.getComplexityText(draft.complexity ?? 'medium')}\n` +
      (draft.deadline ? `📅 **Дедлайн:** ${this.formatDate(new Date(draft.deadline))}\n` : '') +
      `⏱️ **Длительность:** ${DurationParser.format(draft.estimated_duration ?? 60)} мин\n\n` +
      `Всё верно?`;

    const keyboard: InlineKeyboard = {
      type: 'inline_keyboard',
      payload: {
        buttons: [
          [
            { type: 'callback', text: '✅ Подтвердить', payload: 'task:confirm' },
          ],
          [
            { type: 'callback', text: '✏️ Изменить название', payload: 'task:edit_preview:title' },
            { type: 'callback', text: '📋 Изменить описание', payload: 'task:edit_preview:description' },
          ],
          [
            { type: 'callback', text: '🔥 Изменить приоритет', payload: 'task:edit_preview:priority' },
            { type: 'callback', text: '⚡ Изменить сложность', payload: 'task:edit_preview:complexity' },
          ],
          [
            { type: 'callback', text: '📅 Изменить дедлайн', payload: 'task:edit_preview:deadline' },
            { type: 'callback', text: '⏱️ Изменить длительность', payload: 'task:edit_preview:duration' },
          ],
          [
            { type: 'callback', text: '❌ Отменить', payload: 'menu:main' },
          ],
        ],
      },
    };

    await this.messageSender.showScreen(maxUserId, message, keyboard);
  }



  private async reprioritizeTasks(maxUserId: string): Promise<void> {
    await this.messageSender.showScreen(
      maxUserId,
      '🔄 Пересортирую задачи с учетом вашего текущего состояния...',
    );
    await this.showTaskList(maxUserId);
  }

  private async rescheduleTasks(maxUserId: string): Promise<void> {
    await this.messageSender.showScreen(
      maxUserId,
      '📅 Перепланирую задачи...',
    );
  }

  // Helper methods
  private async saveTaskDraft(maxUserId: string, draft: TaskDraft): Promise<void> {
    await this.userManager.setUserState(
      `draft:${maxUserId}`,
      JSON.stringify(draft),
      3600,
    );
    this.logger.debug(`✅ Draft saved for user ${maxUserId}: ${JSON.stringify(draft)}`);
  }

  private async getTaskDraft(maxUserId: string): Promise<TaskDraft> {
    const draftStr = await this.userManager.getUserState(`draft:${maxUserId}`);
    if (!draftStr) {
      this.logger.warn(`⚠️ No draft found for user ${maxUserId}`);
      return {};
    }

    try {
      const draft = JSON.parse(draftStr);
      this.logger.debug(`✅ Draft retrieved for user ${maxUserId}: ${JSON.stringify(draft)}`);
      return draft;
    } catch {
      this.logger.error(`❌ Failed to parse draft for user ${maxUserId}`);
      return {};
    }
  }

  private async clearTaskDraft(maxUserId: string): Promise<void> {
    await this.userManager.clearUserState(`draft:${maxUserId}`);
    this.logger.debug(`✅ Draft cleared for user ${maxUserId}`);
  }

  private getTaskEmoji(priority: string): string {
    const map = { high: '🔴', medium: '🟡', low: '🟢' };
    return map[priority] || '⚪';
  }

  private getStatusEmoji(status: string): string {
    const map = {
      pending: '📝',
      in_progress: '⏳',
      completed: '✅',
      cancelled: '❌',
    };
    return map[status] || '📝';
  }

  private getPriorityEmoji(priority: string): string {
    const map = { high: '🔴', medium: '🟡', low: '🟢' };
    return map[priority] || '🟡';
  }

  private getPriorityText(priority: string): string {
    const map = { high: 'Высокий', medium: 'Средний', low: 'Низкий' };
    return map[priority] || 'Средний';
  }

  private getComplexityEmoji(complexity: string): string {
    const map = { high: '🔥', medium: '⚡', low: '✨' };
    return map[complexity] || '⚡';
  }

  private getComplexityText(complexity: string): string {
    const map = { high: 'Высокая', medium: 'Средняя', low: 'Низкая' };
    return map[complexity] || 'Средняя';
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString('ru-RU');
  }

  private parseDate(text: string): Date | null {
    const regex = /^(\d{2})\.(\d{2})\.(\d{4})$/;
    const match = text.match(regex);

    if (!match) return null;

    const [, day, month, year] = match;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }

  /**
 * ✏️ Начать редактирование задачи
 */
  private async startEditTask(maxUserId: string, taskId: string, forceReload: boolean = false): Promise<void> {
    try {
      let draft = await this.getTaskDraft(maxUserId);

      const shouldLoadFromDB = !draft || !draft.title || forceReload;

      if (shouldLoadFromDB) {
        this.logger.log(`🔄 Loading task ${taskId} from DB (forceReload=${forceReload})`);

        const task = await this.serviceIntegration.getTask(taskId);

        if (!task) {
          await this.messageSender.showScreen(
            maxUserId,
            '❌ Задача не найдена',
          );
          return;
        }

        // ДОБАВЛЕНО: Логируем ВСЮ задачу из БД
        this.logger.log(`📦 Task from DB: ${JSON.stringify(task)}`);

        draft = {
          title: task.title,
          description: task.description || '',
          priority: task.priority || 'medium',
          complexity: task.complexity || 'medium',
          deadline: task.deadline || undefined,
          estimated_duration: task.estimated_duration || 60,
          required_energy: task.required_energy || 6,
          required_focus: task.required_focus || 60,
        };

        await this.saveTaskDraft(maxUserId, draft);
        this.logger.log(`✅ NEW draft created from DB: ${JSON.stringify(draft)}`);
      } else {
        this.logger.log(`✅ Using EXISTING draft: ${JSON.stringify(draft)}`);
      }

      // Сохраняем ID редактируемой задачи
      await this.userManager.setUserState(`${maxUserId}:editing_task_id`, taskId);

      // Формируем сообщение с ТЕКУЩИМИ данными из draft
      let message = `✏️ **Редактирование задачи**\n\n`;
      message += `📝 **Название:** ${draft.title}\n`;

      if (draft.description) {
        const shortDesc = draft.description.length > 50
          ? draft.description.substring(0, 50) + '...'
          : draft.description;
        message += `📋 **Описание:** ${shortDesc}\n`;
      }

      const priorityEmoji = draft.priority === 'high' ? '🔴' :
        draft.priority === 'medium' ? '🟡' : '🟢';
      const priorityText = draft.priority === 'high' ? 'Высокий' :
        draft.priority === 'medium' ? 'Средний' : 'Низкий';
      message += `${priorityEmoji} **Приоритет:** ${priorityText}\n`;

      const complexityEmoji = draft.complexity === 'high' ? '🔥' :
        draft.complexity === 'medium' ? '⚡' : '✨';
      const complexityText = draft.complexity === 'high' ? 'Высокая' :
        draft.complexity === 'medium' ? 'Средняя' : 'Низкая';
      message += `${complexityEmoji} **Сложность:** ${complexityText}\n`;

      message += `⏱️ **Длительность:** ${draft.estimated_duration} мин\n`;

      if (draft.deadline) {
        const deadlineDate = new Date(draft.deadline);
        message += `📅 **Дедлайн:** ${this.formatDate(deadlineDate)}\n`;
      }

      message += `\nВыберите, что хотите изменить:`;

      const keyboard: InlineKeyboard = {
        type: 'inline_keyboard',
        payload: {
          buttons: [
            [
              { type: 'callback', text: '📝 Название', payload: `task:edit_field:title` },
              { type: 'callback', text: '📋 Описание', payload: `task:edit_field:description` },
            ],
            [
              { type: 'callback', text: '🔥 Приоритет', payload: `task:edit_field:priority` },
              { type: 'callback', text: '⚡ Сложность', payload: `task:edit_field:complexity` },
            ],
            [
              { type: 'callback', text: '📅 Дедлайн', payload: `task:edit_field:deadline` },
              { type: 'callback', text: '⏱️ Длительность', payload: `task:edit_field:duration` },
            ],
            [
              { type: 'callback', text: '✅ Сохранить изменения', payload: `task:save_edit` },
            ],
            [
              { type: 'callback', text: '❌ Отменить', payload: 'task:list' },
            ],
          ],
        },
      };

      await this.messageSender.showScreen(maxUserId, message, keyboard);
    } catch (error) {
      this.logger.error(`Error starting task edit: ${error.message}`);
      await this.messageSender.showScreen(
        maxUserId,
        '❌ Ошибка при загрузке задачи для редактирования',
      );
    }
  }



  /**
   * ✏️ Начать редактирование конкретного поля
   */
  private async handleEditField(maxUserId: string, field: string): Promise<void> {
    const draft = await this.getTaskDraft(maxUserId);

    let message: string = '';
    let keyboard: InlineKeyboard | undefined;

    const editingTaskId = await this.userManager.getUserState(`${maxUserId}:editing_task_id`);

    switch (field) {
      case 'title':
        message = '✏️ Введите новое название задачи:';
        await this.userManager.setUserState(maxUserId, 'editing_task_title');
        break;

      case 'description':
        message = '📋 Введите новое описание задачи:';
        await this.userManager.setUserState(maxUserId, 'editing_task_description');
        break;

      case 'priority':
        message = '🔥 Выберите новый приоритет:';
        keyboard = {
          type: 'inline_keyboard',
          payload: {
            buttons: [
              [
                { type: 'callback', text: '🔴 Высокий', payload: 'task:update_priority:high' },
                { type: 'callback', text: '🟡 Средний', payload: 'task:update_priority:medium' },
                { type: 'callback', text: '🟢 Низкий', payload: 'task:update_priority:low' },
              ],
              [
                { type: 'callback', text: '↩️ Назад', payload: `task:edit:${editingTaskId}` },
              ],
            ],
          },
        };
        break;

      case 'complexity':
        message = '⚡ Выберите новую сложность:';
        keyboard = {
          type: 'inline_keyboard',
          payload: {
            buttons: [
              [
                { type: 'callback', text: '🔥 Высокая', payload: 'task:update_complexity:high' },
                { type: 'callback', text: '⚡ Средняя', payload: 'task:update_complexity:medium' },
                { type: 'callback', text: '✨ Низкая', payload: 'task:update_complexity:low' },
              ],
              [
                { type: 'callback', text: '↩️ Назад', payload: `task:edit:${editingTaskId}` },
              ],
            ],
          },
        };
        break;

      case 'deadline':
        message = '📅 Выберите новый дедлайн:';
        keyboard = {
          type: 'inline_keyboard',
          payload: {
            buttons: [
              [
                { type: 'callback', text: '📅 Завтра', payload: 'task:update_deadline:tomorrow' },
                { type: 'callback', text: '📆 Через неделю', payload: 'task:update_deadline:week' },
              ],
              [
                { type: 'callback', text: '🚫 Убрать дедлайн', payload: 'task:update_deadline:skip' },
              ],
              [
                { type: 'callback', text: '↩️ Назад', payload: `task:edit:${editingTaskId}` },
              ],
            ],
          },
        };
        break;

      case 'duration':
        message = '⏱️ Выберите новую длительность:';
        keyboard = {
          type: 'inline_keyboard',
          payload: {
            buttons: [
              [
                { type: 'callback', text: '15 мин', payload: 'task:update_duration:15' },
                { type: 'callback', text: '30 мин', payload: 'task:update_duration:30' },
                { type: 'callback', text: '60 мин', payload: 'task:update_duration:60' },
              ],
              [
                { type: 'callback', text: '2 часа', payload: 'task:update_duration:120' },
                { type: 'callback', text: '4 часа', payload: 'task:update_duration:240' },
              ],
              [
                { type: 'callback', text: '↩️ Назад', payload: `task:edit:${editingTaskId}` },
              ],
            ],
          },
        };
        break;

      default:
        message = '❌ Неизвестное поле для редактирования';
        break;
    }

    // Отправляем сообщение (message теперь всегда инициализирована)
    if (keyboard) {
      await this.messageSender.showScreen(maxUserId, message, keyboard);
    } else {
      await this.messageSender.showScreen(maxUserId, message);
    }
  }



  /**
   * 💾 Сохранить изменения задачи
   */
  private async saveEditedTask(maxUserId: string): Promise<void> {
    const user = await this.userManager.getUserByMaxId(maxUserId);
    if (!user) return;

    const taskId = await this.userManager.getUserState(`${maxUserId}:editing_task_id`);
    if (!taskId) {
      await this.messageSender.showScreen(maxUserId, '❌ Не найдена задача для сохранения');
      return;
    }

    const draft = await this.getTaskDraft(maxUserId);

    try {
      await this.serviceIntegration.updateTask(taskId, {
        title: draft.title,
        description: draft.description,
        priority: draft.priority,
        complexity: draft.complexity,
        deadline: draft.deadline,
        estimated_duration: draft.estimated_duration,
        required_energy: draft.required_energy,
        required_focus: draft.required_focus,
      });

      await this.clearTaskDraft(maxUserId);
      await this.userManager.clearUserState(`${maxUserId}:editing_task_id`);

      await this.messageSender.showScreen(
        maxUserId,
        '✅ Задача успешно обновлена!',
      );

      // Показываем список задач
      await this.showTaskList(maxUserId);
    } catch (error) {
      this.logger.error(`Error saving edited task: ${error.message}`);
      await this.messageSender.showScreen(
        maxUserId,
        '❌ Ошибка при сохранении изменений',
      );
    }
  }

  /**
   * 🗑️ Удалить задачу
   */
  private async handleDeleteTask(maxUserId: string, taskId: string): Promise<void> {
    try {
      const task = await this.serviceIntegration.getTask(taskId);

      if (!task) {
        await this.messageSender.showScreen(maxUserId, '❌ Задача не найдена');
        return;
      }

      const message = `🗑️ **Удаление задачи**\n\n📝 ${task.title}\n\nВы уверены?`;

      const keyboard: InlineKeyboard = {
        type: 'inline_keyboard',
        payload: {
          buttons: [
            [
              { type: 'callback', text: '✅ Да, удалить', payload: `task:confirm_delete:${taskId}` },
            ],
            [
              { type: 'callback', text: '❌ Отмена', payload: 'task:list' },
            ],
          ],
        },
      };

      await this.messageSender.showScreen(maxUserId, message, keyboard);
    } catch (error) {
      this.logger.error(`Error deleting task: ${error.message}`);
      await this.messageSender.showScreen(maxUserId, '❌ Ошибка при удалении задачи');
    }
  }

  /**
   * 🔄 Возобновить задачу (reopen)
   */
  private async handleReopenTask(maxUserId: string, taskId: string): Promise<void> {
    try {
      await this.serviceIntegration.updateTask(taskId, {
        status: 'pending',
      });

      await this.messageSender.showScreen(
        maxUserId,
        '🔄 Задача возобновлена и перемещена в активные!',
      );

      await this.showTaskList(maxUserId);
    } catch (error) {
      this.logger.error(`Error reopening task: ${error.message}`);
      await this.messageSender.showScreen(maxUserId, '❌ Ошибка при возобновлении задачи');
    }
  }

  async handleEditTitleInput(maxUserId: string, text: string): Promise<void> {
    const draft = await this.getTaskDraft(maxUserId);
    draft.title = text;
    await this.saveTaskDraft(maxUserId, draft);

    const editingTaskId = await this.userManager.getUserState(`${maxUserId}:editing_task_id`);
    // НЕ перезагружаем из БД!
    await this.startEditTask(maxUserId, editingTaskId || "", false);
  }

  async handleEditDescriptionInput(maxUserId: string, text: string): Promise<void> {
    const draft = await this.getTaskDraft(maxUserId);
    draft.description = text;
    await this.saveTaskDraft(maxUserId, draft);

    const editingTaskId = await this.userManager.getUserState(`${maxUserId}:editing_task_id`);
    // НЕ перезагружаем из БД!
    await this.startEditTask(maxUserId, editingTaskId || "", false);
  }
  private async handleEditPreviewField(maxUserId: string, field: string): Promise<void> {
    const draft = await this.getTaskDraft(maxUserId);

    let message: string;
    let keyboard: InlineKeyboard | undefined;

    switch (field) {
      case 'title':
        message = `✏️ **Изменить название**\n\nТекущее: ${draft.title}\n\nВведите новое название:`;
        await this.userManager.setUserState(maxUserId, 'editing_preview_title');
        break;

      case 'description':
        message = `📋 **Изменить описание**\n\n${draft.description ? `Текущее: ${draft.description}\n\n` : ''}Введите новое описание:`;
        await this.userManager.setUserState(maxUserId, 'editing_preview_description');
        break;

      case 'priority':
        message = '🔥 **Выберите приоритет:**';
        keyboard = {
          type: 'inline_keyboard',
          payload: {
            buttons: [
              [
                { type: 'callback', text: '🔴 Высокий', payload: 'task:update_preview_priority:high' },
                { type: 'callback', text: '🟡 Средний', payload: 'task:update_preview_priority:medium' },
                { type: 'callback', text: '🟢 Низкий', payload: 'task:update_preview_priority:low' },
              ],
              [
                { type: 'callback', text: '⬅️ Назад к предпросмотру', payload: 'task:back_to_preview' },
              ],
            ],
          },
        };
        break;

      case 'complexity':
        message = '⚡ **Выберите сложность:**';
        keyboard = {
          type: 'inline_keyboard',
          payload: {
            buttons: [
              [
                { type: 'callback', text: '🔥 Высокая', payload: 'task:update_preview_complexity:high' },
                { type: 'callback', text: '⚡ Средняя', payload: 'task:update_preview_complexity:medium' },
                { type: 'callback', text: '✨ Низкая', payload: 'task:update_preview_complexity:low' },
              ],
              [
                { type: 'callback', text: '⬅️ Назад к предпросмотру', payload: 'task:back_to_preview' },
              ],
            ],
          },
        };
        break;

      case 'deadline':
        message = '📅 **Выберите дедлайн:**';
        keyboard = {
          type: 'inline_keyboard',
          payload: {
            buttons: [
              [
                { type: 'callback', text: '🌅 Завтра', payload: 'task:update_preview_deadline:tomorrow' },
                { type: 'callback', text: '📆 Через неделю', payload: 'task:update_preview_deadline:week' },
              ],
              [
                { type: 'callback', text: '⏭️ Пропустить', payload: 'task:update_preview_deadline:skip' },
              ],
              [
                { type: 'callback', text: '⬅️ Назад к предпросмотру', payload: 'task:back_to_preview' },
              ],
            ],
          },
        };
        break;

      case 'duration':
        message = '⏱️ **Выберите длительность:**';
        keyboard = {
          type: 'inline_keyboard',
          payload: {
            buttons: [
              [
                { type: 'callback', text: '15 мин', payload: 'task:update_preview_duration:15' },
                { type: 'callback', text: '30 мин', payload: 'task:update_preview_duration:30' },
                { type: 'callback', text: '60 мин', payload: 'task:update_preview_duration:60' },
              ],
              [
                { type: 'callback', text: '2 часа', payload: 'task:update_preview_duration:120' },
                { type: 'callback', text: '4 часа', payload: 'task:update_preview_duration:240' },
              ],
              [
                { type: 'callback', text: '⬅️ Назад к предпросмотру', payload: 'task:back_to_preview' },
              ],
            ],
          },
        };
        break;

      default:
        message = '❌ Неизвестное поле';
        break;
    }

    if (keyboard) {
      await this.messageSender.showScreen(maxUserId, message, keyboard);
    } else {
      await this.messageSender.showScreen(maxUserId, message);
    }
  }
  async handleEditPreviewTitleInput(maxUserId: string, text: string): Promise<void> {
    const draft = await this.getTaskDraft(maxUserId);
    draft.title = text;
    await this.saveTaskDraft(maxUserId, draft);
    await this.showTaskPreview(maxUserId, draft);
  }

  async handleEditPreviewDescriptionInput(maxUserId: string, text: string): Promise<void> {
    const draft = await this.getTaskDraft(maxUserId);
    draft.description = text;
    await this.saveTaskDraft(maxUserId, draft);
    await this.showTaskPreview(maxUserId, draft);
  }

  /**
 * Запрашивает ручной ввод длительности
 */
private async handleManualDuration(maxUserId: string): Promise<void> {
  await this.userManager.setUserState(maxUserId, 'awaiting_duration_manual', 3600);

  const keyboard: InlineKeyboard = {
    type: 'inline_keyboard',
    payload: {
      buttons: [
        [{ type: 'callback', text: '❌ Отмена', payload: 'menu:main' }],
      ],
    },
  };

  await this.messageSender.showScreen(
    maxUserId,
    `✏️ **Введите длительность**\n\n${DurationParser.getHints()}`,
    keyboard,
  );
}

/**
 * Обработка текстового ввода длительности
 */
async handleDurationManualInput(maxUserId: string, text: string): Promise<void> {
  try {
    const duration = DurationParser.parse(text);

    if (duration === null) {
      const keyboard: InlineKeyboard = {
        type: 'inline_keyboard',
        payload: {
          buttons: [
            [{ type: 'callback', text: '🔄 Попробовать снова', payload: 'task:manual_duration' }],
            [{ type: 'callback', text: '❌ Отмена', payload: 'menu:main' }],
          ],
        },
      };

      await this.messageSender.showScreen(
        maxUserId,
        `❌ **Не удалось распознать длительность**\n\n${DurationParser.getHints()}`,
        keyboard,
      );
      return;
    }

    // Сохраняем длительность в черновик
    const draft = await this.getTaskDraft(maxUserId);
    draft.estimated_duration = duration;
    await this.saveTaskDraft(maxUserId, draft);

    await this.userManager.setUserState(maxUserId, 'awaiting_preview');
    await this.showTaskPreview(maxUserId, draft);
  } catch (error) {
    this.logger.error(`Error handling duration input: ${error.message}`, error.stack);
    await this.messageSender.showScreen(
      maxUserId,
      '❌ Ошибка при обработке длительности. Попробуйте еще раз.',
    );
  }
}

}
