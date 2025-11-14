import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Bot } from '@maxhub/max-bot-api';
import { AdminClientService } from '../admin-client/admin-client.service';
import { CommandHandler } from './handlers/command.handler';
import { OnboardingHandler } from './handlers/onboarding.handler';
import { TaskHandler } from './handlers/task.handler';
import { TestHandler } from './handlers/test.handler';
import { MitHandler } from './handlers/mit.handler';
import { StatsHandler } from './handlers/stats.handler';
import { SettingsHandler } from './handlers/settings.handler';
import { MessageSender } from './services/message-sender.service';
import { UserManager } from './services/user-manager.service';
import { MlTaskGenerationHandler } from './handlers/ml-task-generation.handler';
import { PomodoroHandler } from './handlers/pomodoro.handler';
import { StressReliefHandler } from './handlers/stress-relief.handler';
import { UIAdapterService } from './services/ui-adapter.service';
import { HelpHandler } from './handlers/help.handler';
import { ServiceIntegration } from './services/service-integration.service';

export interface MaxReplyKeyboard {
  type: 'keyboard';
  payload: {
    buttons: MaxReplyButton[][];
    resize?: boolean;
    once?: boolean;
    persistent?: boolean;
  };
}

export interface MaxReplyButton {
  type: 'default' | 'request_contact' | 'request_geo_location';
  text: string;
  payload?: string;
}

export interface MaxInlineKeyboard {
  type: 'inline_keyboard';
  payload: {
    buttons: MaxInlineButton[][];
  };
}

export interface MaxInlineButton {
  type: 'callback';
  text: string;
  payload: string;
}

export type InlineKeyboard = MaxInlineKeyboard;
export type ReplyKeyboard = MaxReplyKeyboard;

export enum TestType {
  ENERGY = 'energy',
  FOCUS = 'focus',
  MOTIVATION = 'motivation',
  STRESS = 'stress',
}

@Injectable()
export class BotService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BotService.name);
  private bot: Bot;
  private isStarting = false;
  private startPromise: Promise<void> | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly adminClient: AdminClientService,
    private readonly commandHandler: CommandHandler,
    private readonly onboardingHandler: OnboardingHandler,
    private readonly taskHandler: TaskHandler,
    private readonly testHandler: TestHandler,
    private readonly mitHandler: MitHandler,
    private readonly statsHandler: StatsHandler,
    private readonly settingsHandler: SettingsHandler,
    private readonly messageSender: MessageSender,
    private readonly userManager: UserManager,
    private readonly mlTaskHandler: MlTaskGenerationHandler,
    private readonly pomodoroHandler: PomodoroHandler,
    private readonly uiAdapterService: UIAdapterService,
    private readonly helpHandler: HelpHandler,
    private readonly stressReliefHandler: StressReliefHandler,
    private readonly serviceIntegration: ServiceIntegration
  ) {
    const token = this.configService.get<string>('MAX_BOT_TOKEN');
    if (!token) {
      throw new Error('MAX_BOT_TOKEN is not defined');
    }
    this.bot = new Bot(token);
  }

  async onModuleInit() {
    if (this.isStarting || this.startPromise) {
      this.logger.warn('Bot is already starting, skipping duplicate initialization');
      return; // ← УБРАТЬ await this.startPromise
    }

    this.isStarting = true;
    this.logger.log('🚀 BotService initialization started');
    this.logger.log(`Bot token: ${this.configService.get('MAX_BOT_TOKEN')?.substring(0, 10)}...`);

    this.messageSender.setBot(this.bot);

    this.logger.log('⚙️ Setting up handlers...');
    this.setupHandlers();
    this.logger.log('✅ Handlers setup complete');

    this.logger.log('🤖 Starting bot...');

    // ИСПРАВЛЕНИЕ: Запускаем бота БЕЗ await — в фоновом режиме
    this.bot.start()
      .then(() => {
        this.logger.log('✅ Bot started successfully and ready to receive updates');
        this.isStarting = false;
      })
      .catch((error) => {
        this.logger.error(`❌ Failed to start bot: ${error.message}`, error.stack);
        this.isStarting = false;

        // Retry after 5 seconds
        setTimeout(() => {
          this.logger.log('🔄 Retrying bot start...');
          this.bot.start()
            .then(() => {
              this.logger.log('✅ Bot started successfully on retry');
            })
            .catch((retryError) => {
              this.logger.error(`❌ Retry failed: ${retryError.message}`);
            });
        }, 5000);
      });

    this.logger.log('✅ onModuleInit complete (bot starting in background)');

    // НЕ ВОЗВРАЩАЕМ Promise - позволяем Nest продолжить инициализацию
    return; // ← ВАЖНО: не return this.startPromise
  }

  async onModuleDestroy() {
    try {
      await this.bot.stop();
      this.logger.log('Bot stopped successfully');
    } catch (error) {
      this.logger.error(`Error stopping bot: ${error.message}`);
    }
  }


  private async handleStartCommand(maxUserId: string, ctx: any) {

    this.messageSender.saveContext(maxUserId, ctx);

    const maxUser = {
      id: maxUserId,
      username: ctx.update.message?.sender?.name,
      first_name: ctx.update.message?.sender?.first_name,
      name: ctx.update.message?.sender?.name,
    };

    await this.userManager.ensureUserExists(maxUserId, maxUser);

    // ИСПРАВЛЕНО: используем новый метод sendMainMenu вместо старого
    await this.sendMainMenu(maxUserId);
  }


  private async handleTextMessage(maxUserId: string, text: string, ctx: any) {
    try {
      const userState = await this.userManager.getUserState(maxUserId);

      if (!userState) {
        await this.messageSender.showScreen(
          maxUserId,
          'Используйте кнопки меню для управления задачами.',
          this.createMainMenuKeyboard()
        );
        return;
      }

      switch (userState) {
        case 'awaiting_task_input':
          await this.taskHandler.handleTaskInput(maxUserId, text);
          break;
        case 'awaiting_task_description':
          await this.taskHandler.handleTaskDescriptionInput(maxUserId, text);
          break;
        case 'awaiting_deadline':
          await this.taskHandler.handleDeadlineInput(maxUserId, text);
          break;
        case 'awaiting_ml_task_input':
          await this.mlTaskHandler.handleTaskInput(maxUserId, text);
          break;
        case 'ml_editing_title':
          await this.mlTaskHandler.handleTextEdit(maxUserId, text, 'title');
          break;
        case 'ml_editing_description':
          await this.mlTaskHandler.handleTextEdit(maxUserId, text, 'description');
          break;
        case 'ml_editing_deadline':
          await this.mlTaskHandler.handleTextEdit(maxUserId, text, 'deadline');
          break;
        case 'awaiting_start_time':
          await this.settingsHandler.handleWorkHoursInput(maxUserId, text);
          break;
        case 'awaiting_end_time':
          await this.settingsHandler.handleWorkHoursInput(maxUserId, text);
          break;
        case 'editing_task_title':
          await this.taskHandler.handleEditTitleInput(maxUserId, text);
          await this.userManager.clearUserState(maxUserId);
          return;
        case 'editing_task_description':
          await this.taskHandler.handleEditDescriptionInput(maxUserId, text);
          await this.userManager.clearUserState(maxUserId);
          return;
        case 'editing_preview_title':
          await this.taskHandler.handleEditPreviewTitleInput(maxUserId, text);
          await this.userManager.clearUserState(maxUserId);
          return;

        case 'editing_preview_description':
          await this.taskHandler.handleEditPreviewDescriptionInput(maxUserId, text);
          await this.userManager.clearUserState(maxUserId);
          return;
        case 'awaiting_duration_manual':
          await this.taskHandler.handleDurationManualInput(maxUserId, text);
          break;
        case 'in_test':
          await this.messageSender.showScreen(
            maxUserId,
            '⚠️ Пожалуйста, используйте кнопки для ответа на вопросы теста.',
          );
          break;
        case 'awaiting_work_hours':
          await this.settingsHandler.handleWorkHoursInput(maxUserId, text);
          break;
        default:
          await this.userManager.clearUserState(maxUserId);
          await this.messageSender.showScreen(
            maxUserId,
            'Используйте кнопки меню.',
            this.createMainMenuKeyboard()
          );
      }
    } catch (error) {
      this.logger.error(`Error handling text message: ${error.message}`);
      await this.messageSender.showScreen(
        maxUserId,
        '❌ Произошла ошибка. Попробуйте еще раз.',
        this.createMainMenuKeyboard()
      );
    }
  }

  private async handleCallbackQuery(ctx: any) {
    this.logger.log('🟢 handleCallbackQuery called');

    const update = ctx.update;

    if (!update?.callback) {
      this.logger.warn('❌ No callback data in update');
      return;
    }

    const callback = update.callback;
    const maxUserId = callback.user?.user_id?.toString();
    const data = callback.payload;
    const callbackMessageId = update.message?.body?.mid; // ИСПРАВЛЕНО: теперь update.message.body.mid

    this.logger.debug(`🔘 Callback data: payload="${data}", userId="${maxUserId}", mid="${callbackMessageId}"`);

    if (!maxUserId || !data) {
      this.logger.warn('❌ Missing userId or payload in callback');
      return;
    }

    this.logger.debug(`Processing callback: ${data} from user ${maxUserId}`);

    // Сохраняем контекст
    this.messageSender.saveContext(maxUserId, ctx);

    // ВАЖНО: Трекаем callback-сообщение СРАЗУ
    if (callbackMessageId) {
      this.logger.log(`🟡 About to track callback message ${callbackMessageId}`);
      await this.messageSender.trackUserMessage(maxUserId, callbackMessageId);
      this.logger.log(`🔘 Tracked callback message ${callbackMessageId} from ${maxUserId}`);
    } else {
      this.logger.warn('❌ No callbackMessageId to track');
    }

    const [action, ...params] = data.split(':');

    try {
      switch (action) {
        case 'onboarding':
          await this.onboardingHandler.handleCallback(maxUserId, params);
          break;
        case 'menu':
          await this.handleMenuNavigation(maxUserId, params);
          break;
        case 'task':
          await this.taskHandler.handleCallback(maxUserId, params);
          break;
        case 'test':
          await this.testHandler.handleCallback(maxUserId, params);
          break;
        case 'mit':
          await this.mitHandler.handleCallback(maxUserId, params);
          break;
        case 'settings':
          await this.settingsHandler.handleCallback(maxUserId, params);
          break;
        case 'stats':
          await this.statsHandler.handleCallback(maxUserId, params);
          break;
        case 'ml_gen':
          await this.mlTaskHandler.handleCallback(maxUserId, params);
          break;
        case 'ml_gen:set':
          await this.mlTaskHandler.handleSetValue(maxUserId, params);
          break;
        case 'pomodoro':
          await this.pomodoroHandler.handleCallback(maxUserId, params);
          break;
        case 'help':
          await this.helpHandler.handleCallback(maxUserId, params);
          break;
        case 'stress':
          await this.stressReliefHandler.handleCallback(maxUserId, params);
          break;
        default:
          this.logger.warn(`Unknown callback action: ${action}`);
      }

      this.logger.debug('✅ Callback handled successfully');
    } catch (error) {
      this.logger.error(`Error handling callback: ${error.message}`, error.stack);
    }
  }

  private async handleMenuNavigation(maxUserId: string, params: string[]) {
    const submenu = params[0];

    switch (submenu) {
      case 'main':
        await this.sendMainMenu(maxUserId);
        break;

      case 'tasks':
        const taskCount = await this.getTaskCount(maxUserId);
        const tasksMenu = this.uiAdapterService.getTasksMenu(taskCount);
        await this.messageSender.showScreen(maxUserId, tasksMenu.text, tasksMenu.keyboard);
        break;

      case 'focus':
        const focusMenu = this.uiAdapterService.getFocusMenu();
        await this.messageSender.showScreen(maxUserId, focusMenu.text, focusMenu.keyboard);
        break;

      case 'more':
        const moreMenu = this.uiAdapterService.getMoreMenu();
        await this.messageSender.showScreen(maxUserId, moreMenu.text, moreMenu.keyboard);
        break;

      case 'wellness':
        const wellnessMenu = this.uiAdapterService.getWellnessMenu();
        await this.messageSender.showScreen(maxUserId, wellnessMenu.text, wellnessMenu.keyboard);
        break;

      case 'help':
        const helpMenu = this.uiAdapterService.getHelpMenu();
        await this.messageSender.showScreen(maxUserId, helpMenu.text, helpMenu.keyboard);
        break;

      case 'about':
        const aboutMenu = this.uiAdapterService.getAboutMenu();
        await this.messageSender.showScreen(maxUserId, aboutMenu.text, aboutMenu.keyboard);
        break;
    }
  }

  // ДОБАВИТЬ вспомогательный метод
  private async getTaskCount(maxUserId: string): Promise<number> {
    try {
      const user = await this.userManager.getUserByMaxId(maxUserId);
      if (!user) return 0;

      // ИСПРАВЛЕНО: используем правильный метод
      const tasks = await this.serviceIntegration.getUserTasks(user.id);

      // Фильтруем только активные задачи (pending и in_progress)
      if (!Array.isArray(tasks)) return 0;

      const activeTasks = tasks.filter((taskItem: any) => {
        const task = taskItem.task || taskItem;
        return task.status === 'pending' || task.status === 'in_progress';
      });

      return activeTasks.length;
    } catch (error) {
      this.logger.error(`Error getting task count: ${error.message}`);
      return 0;
    }
  }

  // УДАЛИТЬ все команды из setupHandlers (оставить только /start для первого запуска)
  private setupHandlers() {
    this.logger.log('📝 Setting up handlers...');

    // Команда /start
    this.bot.command('start', async (ctx: any) => {
      this.logger.log('📩 Got /start command');
      const maxUserId = ctx.update.message?.sender?.user_id?.toString();

      if (!maxUserId) {
        this.logger.error('Cannot extract maxUserId from update');
        return;
      }

      await this.handleStartCommand(maxUserId, ctx);
    });

    // ВАЖНО: Восстановить обработчики сообщений!
    this.bot.on('message_created', async (ctx: any) => {
      this.logger.log('📩 Got message');

      const maxUserId = ctx.update.message?.sender?.user_id?.toString();
      if (maxUserId) {
        this.messageSender.saveContext(maxUserId, ctx);
      }

      await this.handleMessage(ctx);
    });

    this.bot.on('message_callback', async (ctx: any) => {
      this.logger.log('🔘 Got callback');

      const maxUserId = ctx.update.callback?.user?.user_id?.toString();
      if (maxUserId) {
        this.messageSender.saveContext(maxUserId, ctx);
      }

      await this.handleCallbackQuery(ctx);
    });

    this.logger.log('✅ Handlers registered');
  }
  private createMainMenuKeyboard(): MaxInlineKeyboard {
    return {
      type: 'inline_keyboard',
      payload: {
        buttons: [
          [
            { type: 'callback', text: '📋 Мои задачи', payload: 'task:list' },
            { type: 'callback', text: '🎯 MIT', payload: 'mit:show' },
          ],
          [
            { type: 'callback', text: '🧪 Пройти тест', payload: 'test:menu' },
            { type: 'callback', text: '📊 Статистика', payload: 'stats:summary' },
          ],
          [
            { type: 'callback', text: '➕ Добавить задачу', payload: 'task:add' },
            { type: 'callback', text: '⚙️ Настройки', payload: 'settings:menu' },
          ],
        ],
      },
    };
  }

  async sendMainMenu(maxUserId: string) {
    // Получаем текущее состояние пользователя
    const user = await this.userManager.getUserByMaxId(maxUserId);
    const uiMode = user?.ui_mode || 'NORMAL';
    const userName = user?.name || user?.username;

    const { text, keyboard } = this.uiAdapterService.getMainMenu(uiMode, userName);
    await this.messageSender.showScreen(maxUserId, text, keyboard);
  }

  async sendMessage(maxUserId: string, text: string, keyboard?: InlineKeyboard) {
    return this.messageSender.showScreen(maxUserId, text, keyboard);
  }

  async sendTestReminder(maxUserId: string, testType: TestType) {
    return this.testHandler.sendTestReminder(maxUserId, testType);
  }
  private async handleMessage(ctx: any) {
    this.logger.log('🟢 handleMessage called');

    const update = ctx.update;

    if (!update?.message) {
      this.logger.warn('❌ No message in update');
      return;
    }

    const message = update.message;
    const text = message.body?.text;
    const maxUserId = message.sender?.user_id?.toString();
    const userMessageId = message.body?.mid; // ИСПРАВЛЕНО: был message.mid, теперь message.body.mid

    this.logger.debug(`📩 Message data: text="${text}", userId="${maxUserId}", mid="${userMessageId}"`);

    if (!text || !maxUserId) {
      this.logger.warn('❌ Missing text or userId');
      return;
    }

    // Сохраняем контекст СРАЗУ
    this.messageSender.saveContext(maxUserId, ctx);

    const maxUser = {
      id: maxUserId,
      username: message.sender?.name || message.sender?.username,
      first_name: message.sender?.first_name,
      name: message.sender?.name,
    };

    this.logger.debug('Ensuring user exists for:', maxUserId);
    await this.userManager.ensureUserExists(maxUserId, maxUser);

    // ВАЖНО: Трекаем сообщение пользователя СРАЗУ после получения
    if (userMessageId) {
      this.logger.log(`🟡 About to track user message ${userMessageId}`);
      await this.messageSender.trackUserMessage(maxUserId, userMessageId);
      this.logger.log(`📥 Tracked user message ${userMessageId} from ${maxUserId}`);
    } else {
      this.logger.warn('❌ No userMessageId to track');
    }

    // Обработка команд
    if (text.startsWith('/')) {
      if (text.startsWith('/start')) {
        await this.handleStartCommand(maxUserId, ctx);
        return;
      }

      await this.messageSender.showScreen(
        maxUserId,
        '❌ Пожалуйста, используйте кнопки для навигации.\nКоманды через "/" отключены.',
      );
      return;
    }

    // Обработка текстовых сообщений
    await this.handleTextMessage(maxUserId, text, ctx);
  }


  getBot(): Bot {
    return this.bot;
  }
}
