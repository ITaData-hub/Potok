// src/modules/bot/handlers/onboarding.handler.ts
import { Injectable, Logger } from '@nestjs/common';
import { MessageSender } from '../services/message-sender.service';
import { UserManager } from '../services/user-manager.service';
import { InlineKeyboard } from '../bot.service';

@Injectable()
export class OnboardingHandler {
  private readonly logger = new Logger(OnboardingHandler.name);

  constructor(
    private readonly messageSender: MessageSender,
    private readonly userManager: UserManager,
  ) {}

  async handleCallback(maxUserId: string, params: string[]): Promise<void> {
    const step = params[0];

    switch (step) {
      case 'start':
        await this.step1(maxUserId);
        break;
      case 'step2':
        await this.step2(maxUserId);
        break;
      case 'step3':
        await this.step3(maxUserId);
        break;
      case 'complete':
        await this.complete(maxUserId);
        break;
      default:
        this.logger.warn(`Unknown onboarding step: ${step}`);
    }
  }

  private async step1(maxUserId: string): Promise<void> {
    const text = `
📚 **Шаг 1/3: О Потоке**

**Поток** — это система управления задачами, которая адаптируется под ваше состояние.

Основные принципы:
• 🧪 **4 теста в день** — отслеживаем энергию, фокус, мотивацию и стресс
• 🎯 **MIT (Most Important Task)** — каждый день фокус на главном
• 📊 **Умное распределение** — задачи подбираются под ваше состояние
• ⏰ **Циркадные ритмы** — учитываем биологические часы

Готовы продолжить?
`;

    const keyboard: InlineKeyboard = {
      type: 'inline_keyboard',
      payload: {
        buttons: [
          [{ type: 'callback', text: '▶️ Далее', payload: 'onboarding:step2' }],
        ],
      },
    };

    await this.messageSender.showScreen(maxUserId, text, keyboard);
  }

  private async step2(maxUserId: string): Promise<void> {
    const text = `
🧪 **Шаг 2/3: Тесты состояния**

Для точной работы системы проходите 4 теста в день:

1. ⚡ **Энергия** (08:00)
   Физическое состояние, бодрость

2. 🎯 **Фокус** (12:00)
   Способность концентрироваться

3. 💪 **Мотивация** (15:00)
   Желание работать и достигать целей

4. 😰 **Стресс** (18:00)
   Уровень напряжения

Каждый тест занимает 2 минуты.
Я буду напоминать о них автоматически.
`;

    const keyboard: InlineKeyboard = {
      type: 'inline_keyboard',
      payload: {
        buttons: [
          [{ type: 'callback', text: '▶️ Далее', payload: 'onboarding:step3' }],
          [{ type: 'callback', text: '◀️ Назад', payload: 'onboarding:start' }],
        ],
      },
    };

    await this.messageSender.showScreen(maxUserId, text, keyboard);
  }

  private async step3(maxUserId: string): Promise<void> {
    const text = `
⏰ **Шаг 3/3: Настройка рабочего времени**

Укажите ваши рабочие часы для оптимальных рекомендаций.

По умолчанию:
🌅 Начало: 09:00
🌆 Конец: 18:00

Вы можете изменить это позже в настройках.
`;

    const keyboard: InlineKeyboard = {
      type: 'inline_keyboard',
      payload: {
        buttons: [
          [
            { type: 'callback', text: '09:00 - 18:00', payload: 'onboarding:hours:09:00:18:00' },
            { type: 'callback', text: '08:00 - 17:00', payload: 'onboarding:hours:08:00:17:00' },
          ],
          [
            { type: 'callback', text: '10:00 - 19:00', payload: 'onboarding:hours:10:00:19:00' },
            { type: 'callback', text: '✏️ Другое время', payload: 'onboarding:custom_hours' },
          ],
          [
            { type: 'callback', text: '✅ Завершить настройку', payload: 'onboarding:complete' },
          ],
        ],
      },
    };

    await this.messageSender.showScreen(maxUserId, text, keyboard);
  }

  private async complete(maxUserId: string): Promise<void> {
    const user = await this.userManager.getUserByMaxId(maxUserId);
    if (!user) return;

    await this.userManager.completeOnboarding(user.id);
    await this.userManager.clearUserState(maxUserId);

    const text = `
🎉 **Настройка завершена!**

Вы готовы к работе с Потоком!

**Начните с:**
1. 🧪 Пройдите первый тест — /test
2. ➕ Добавьте задачи — /add
3. 🎯 Получите вашу MIT — /mit

💡 **Совет:** Чем больше тестов вы проходите, тем точнее система подбирает задачи.

Используйте /help для полного списка команд.
`;

    const keyboard: InlineKeyboard = {
      type: 'inline_keyboard',
      payload: {
        buttons: [
          [
            { type: 'callback', text: '🧪 Пройти первый тест', payload: 'test:menu' },
            { type: 'callback', text: '➕ Добавить задачу', payload: 'task:add' },
          ],
          [{ type: 'callback', text: '🏠 Главное меню', payload: 'menu:main' }],
        ],
      },
    };

    await this.messageSender.showScreen(maxUserId, text, keyboard);
  }
}
