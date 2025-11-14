import { Injectable, Logger } from '@nestjs/common';
import { MessageSender } from '../services/message-sender.service';
import { UserManager } from '../services/user-manager.service';
import { PomodoroService } from '../services/pomodoro.service';
import { InlineKeyboard } from '../bot.service';

@Injectable()
export class PomodoroHandler {
  private readonly logger = new Logger(PomodoroHandler.name);

  constructor(
    private readonly messageSender: MessageSender,
    private readonly userManager: UserManager,
    private readonly pomodoroService: PomodoroService,
  ) {}

  async handleCallback(maxUserId: string, params: string[]): Promise<void> {
    const action = params[0];

    switch (action) {
      case 'start':
        await this.startPomodoro(maxUserId);
        break;
      case 'pause':
        await this.pausePomodoro(maxUserId);
        break;
      case 'resume':
        await this.resumePomodoro(maxUserId);
        break;
      case 'stop':
        await this.stopPomodoro(maxUserId);
        break;
      case 'complete':
        await this.completePhase(maxUserId);
        break;
      case 'status':
        await this.showStatus(maxUserId);
        break;
    }
  }

  private async startPomodoro(maxUserId: string): Promise<void> {
    const user = await this.userManager.getUserByMaxId(maxUserId);
    if (!user) return;

    const existing = await this.pomodoroService.getSession(maxUserId);
    if (existing) {
      await this.messageSender.showScreen(
        maxUserId,
        '⚠️ У вас уже есть активная Pomodoro сессия.'
      );
      return;
    }

    const session = await this.pomodoroService.startSession(user.id, maxUserId);
    await this.showSessionStatus(maxUserId, session, '🍅 Pomodoro начат! 25 минут работы.');
  }

  private async pausePomodoro(maxUserId: string): Promise<void> {
    try {
      const session = await this.pomodoroService.pauseSession(maxUserId);
      await this.showSessionStatus(maxUserId, session, '⏸️ Пауза');
    } catch (error) {
      await this.messageSender.showScreen(maxUserId, `❌ ${error.message}`);
    }
  }

  private async resumePomodoro(maxUserId: string): Promise<void> {
    try {
      const session = await this.pomodoroService.resumeSession(maxUserId);
      await this.showSessionStatus(maxUserId, session, '▶️ Продолжаем');
    } catch (error) {
      await this.messageSender.showScreen(maxUserId, `❌ ${error.message}`);
    }
  }

  private async stopPomodoro(maxUserId: string): Promise<void> {
    await this.pomodoroService.stopSession(maxUserId);
    
    const keyboard: InlineKeyboard = {
      type: 'inline_keyboard',
      payload: {
        buttons: [[{ type: 'callback', text: '↩️ Главное меню', payload: 'menu:main' }]],
      },
    };

    await this.messageSender.showScreen(maxUserId, '🛑 Сессия остановлена', keyboard);
  }

  private async completePhase(maxUserId: string): Promise<void> {
    try {
      const session = await this.pomodoroService.completePhase(maxUserId);
      const message = session.currentPhase === 'WORK' 
        ? `✅ Перерыв завершен! Цикл ${session.cycleCount + 1}.`
        : `✅ Цикл ${session.cycleCount} завершен! Отдохните.`;
      
      await this.showSessionStatus(maxUserId, session, message);
    } catch (error) {
      await this.messageSender.showScreen(maxUserId, `❌ ${error.message}`);
    }
  }

  private async showStatus(maxUserId: string): Promise<void> {
    const session = await this.pomodoroService.getSession(maxUserId);
    
    if (!session) {
      const keyboard: InlineKeyboard = {
        type: 'inline_keyboard',
        payload: {
          buttons: [
            [{ type: 'callback', text: '▶️ Начать Pomodoro', payload: 'pomodoro:start' }],
            [{ type: 'callback', text: '↩️ Главное меню', payload: 'menu:main' }],
          ],
        },
      };

      await this.messageSender.showScreen(maxUserId, '🍅 Нет активной сессии.', keyboard);
      return;
    }

    await this.showSessionStatus(maxUserId, session);
  }

  private async showSessionStatus(maxUserId: string, session: any, customMessage?: string): Promise<void> {
    const progress = await this.pomodoroService.getProgress(maxUserId);
    const remaining = await this.pomodoroService.getRemainingTime(maxUserId);

    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    const progressBar = '█'.repeat(Math.floor(progress / 10)) + '░'.repeat(10 - Math.floor(progress / 10));

    const text = `
${customMessage || '🍅 Pomodoro'}

Циклов: ${session.cycleCount}
⏱️ Осталось: ${minutes}:${String(seconds).padStart(2, '0')}
${progressBar} ${progress}%
${session.isPaused ? '⏸️ На паузе' : ''}
`;

    const buttons = session.isPaused
      ? [
          [{ type: 'callback' as const, text: '▶️ Продолжить', payload: 'pomodoro:resume' }],
          [{ type: 'callback' as const, text: '🛑 Остановить', payload: 'pomodoro:stop' }],
        ]
      : [
          [
            { type: 'callback' as const, text: '⏸️ Пауза', payload: 'pomodoro:pause' },
            { type: 'callback' as const, text: '🔄 Обновить', payload: 'pomodoro:status' },
          ],
          [{ type: 'callback' as const, text: '✅ Завершить фазу', payload: 'pomodoro:complete' }],
          [{ type: 'callback' as const, text: '🛑 Остановить', payload: 'pomodoro:stop' }],
        ];

    const keyboard: InlineKeyboard = {
      type: 'inline_keyboard',
      payload: { buttons },
    };

    await this.messageSender.showScreen(maxUserId, text, keyboard);
  }
}
