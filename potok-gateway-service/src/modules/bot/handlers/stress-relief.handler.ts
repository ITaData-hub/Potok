import { Injectable, Logger } from '@nestjs/common';
import { MessageSender } from '../services/message-sender.service';
import { UserManager } from '../services/user-manager.service';
import { InlineKeyboard } from '../bot.service';

@Injectable()
export class StressReliefHandler {
  private readonly logger = new Logger(StressReliefHandler.name);

  constructor(
    private readonly messageSender: MessageSender,
    private readonly userManager: UserManager, // ДОБАВИТЬ
  ) {}

  async handleCallback(maxUserId: string, params: string[]): Promise<void> {
    const action = params[0];

    switch (action) {
      case 'breathing':
        await this.showBreathing(maxUserId);
        break;
      case 'rest':
        await this.showRest(maxUserId);
        break;
      case 'start_breathing':
        await this.startBreathing(maxUserId);
        break;
      case 'stop_breathing':
        await this.stopBreathing(maxUserId);
        break;
    }
  }

  private async showBreathing(maxUserId: string): Promise<void> {
    const text = `
🧘 **Дыхательная техника 4-7-8**

**Инструкция:**
1. Вдох через нос - 4 сек
2. Задержка - 7 сек
3. Выдох через рот - 8 сек

Повторите 4 цикла.
`;

    const keyboard: InlineKeyboard = {
      type: 'inline_keyboard',
      payload: {
        buttons: [
          [{ type: 'callback', text: '▶️ Начать', payload: 'stress:start_breathing' }],
          [{ type: 'callback', text: '↩️ Назад', payload: 'menu:main' }],
        ],
      },
    };

    await this.messageSender.showScreen(maxUserId, text, keyboard);
  }

  private async startBreathing(maxUserId: string): Promise<void> {
    // Установить флаг "в упражнении"
    await this.userManager.setUserState(maxUserId, 'in_breathing');

    await this.messageSender.showScreen(
      maxUserId,
      '🧘 **Начинаем дыхательную практику 4-7-8**\n\nСделайте 4 цикла. Следуйте за таймером.\n\n_Нажмите "Остановить" чтобы прервать_',
      {
        type: 'inline_keyboard',
        payload: {
          buttons: [[{ type: 'callback', text: '🛑 Остановить', payload: 'stress:stop_breathing' }]],
        },
      }
    );

    await this.sleep(3000);

    // Проверяем не остановили ли уже
    const state = await this.userManager.getUserState(maxUserId);
    if (state !== 'in_breathing') {
      return; // Уже остановлено
    }

    for (let cycle = 1; cycle <= 4; cycle++) {
      // Проверка перед каждым циклом
      const currentState = await this.userManager.getUserState(maxUserId);
      if (currentState !== 'in_breathing') {
        this.logger.log(`Exercise stopped at cycle ${cycle}`);
        return;
      }

      // ВДОХ
      const inhaleOk = await this.animatePhase(maxUserId, cycle, 4, '🌬️ ВДОХ', 'через нос', '🌬️');
      if (!inhaleOk) return;

      // ЗАДЕРЖКА
      const holdOk = await this.animatePhase(maxUserId, cycle, 7, '⏸️ ЗАДЕРЖКА', 'задержите дыхание', '⏸️');
      if (!holdOk) return;

      // ВЫДОХ
      const exhaleOk = await this.animatePhase(maxUserId, cycle, 8, '💨 ВЫДОХ', 'через рот', '💨');
      if (!exhaleOk) return;

      if (cycle < 4) await this.sleep(1000);
    }

    // Очистить состояние
    await this.userManager.clearUserState(maxUserId);

    const keyboard: InlineKeyboard = {
      type: 'inline_keyboard',
      payload: {
        buttons: [
          [{ type: 'callback', text: '🔄 Повторить', payload: 'stress:start_breathing' }],
          [{ type: 'callback', text: '📊 Моё состояние', payload: 'stats:current' }],
          [{ type: 'callback', text: '✅ Завершить', payload: 'menu:main' }],
        ],
      },
    };

    await this.messageSender.showScreen(
      maxUserId,
      '✅ **Упражнение завершено!**\n\n🎉 Отличная работа! Вы прошли все 4 цикла.\n\n💚 Как вы себя чувствуете?',
      keyboard
    );
  }

  private async animatePhase(
    maxUserId: string,
    cycle: number,
    duration: number,
    phaseName: string,
    instruction: string,
    emoji: string
  ): Promise<boolean> {
    for (let second = duration; second > 0; second--) {
      // Проверяем состояние
      const state = await this.userManager.getUserState(maxUserId);
      if (state !== 'in_breathing') {
        return false;
      }

      const progressBar = this.createBreathingProgressBar(duration - second, duration);

      const text = `
**Цикл ${cycle}/4** ${emoji}

**${phaseName}** (${second} сек)
_${instruction}_

${progressBar}
`;

      // БЕЗ кнопки остановить в цикле!
      await this.messageSender.showScreen(maxUserId, text);

      await this.sleep(1000);
    }

    return true;
  }

  private createBreathingProgressBar(current: number, total: number): string {
    const filled = Math.floor((current / total) * 20);
    const empty = 20 - filled;
    return '▓'.repeat(filled) + '░'.repeat(empty);
  }

  private async stopBreathing(maxUserId: string): Promise<void> {
    // Очистить состояние = остановить
    await this.userManager.clearUserState(maxUserId);

    const keyboard: InlineKeyboard = {
      type: 'inline_keyboard',
      payload: {
        buttons: [
          [{ type: 'callback', text: '🔄 Начать снова', payload: 'stress:start_breathing' }],
          [{ type: 'callback', text: '🧘 Другие практики', payload: 'menu:wellness' }],
          [{ type: 'callback', text: '↩️ Главная', payload: 'menu:main' }],
        ],
      },
    };

    await this.messageSender.showScreen(
      maxUserId,
      '⏸️ **Упражнение прервано**\n\nНичего страшного! Можете начать снова когда будете готовы.',
      keyboard
    );
  }

  private async showRest(maxUserId: string): Promise<void> {
    const text = `
🚶 **Рекомендации**

**Немедленно:**
• Отойдите от компьютера
• Выпейте воды
• Дыхательное упражнение

**15-30 минут:**
• Прогулка
• Растяжка
• Спокойная музыка

Здоровье важнее дедлайнов!
`;

    const keyboard: InlineKeyboard = {
      type: 'inline_keyboard',
      payload: {
        buttons: [
          [{ type: 'callback', text: '🧘 Дыхание', payload: 'stress:breathing' }],
          [{ type: 'callback', text: '↩️ Главное меню', payload: 'menu:main' }],
        ],
      },
    };

    await this.messageSender.showScreen(maxUserId, text, keyboard);
  }

  async sendCriticalAlert(maxUserId: string, state: any): Promise<void> {
    const text = `
🚨 **КРИТИЧЕСКОЕ СОСТОЯНИЕ**

Показатели:
⚡ Энергия: ${state.energy}/10
😰 Стресс: ${state.stress}/10

**Рекомендуем:**
1. Прекратить работу
2. Дыхательное упражнение
3. Перерыв 30+ минут
`;

    const keyboard: InlineKeyboard = {
      type: 'inline_keyboard',
      payload: {
        buttons: [
          [{ type: 'callback', text: '🧘 Упражнение', payload: 'stress:start_breathing' }],
          [{ type: 'callback', text: '🚶 Советы', payload: 'stress:rest' }],
        ],
      },
    };

    await this.messageSender.showScreen(maxUserId, text, keyboard);
    this.logger.warn(`Critical alert sent to ${maxUserId}`);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
