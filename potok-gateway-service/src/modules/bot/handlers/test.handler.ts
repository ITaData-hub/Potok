// src/modules/bot/handlers/test.handler.ts
import { Injectable, Logger } from '@nestjs/common';
import { MessageSender } from '../services/message-sender.service';
import { UserManager } from '../services/user-manager.service';
import { ServiceIntegration } from '../services/service-integration.service';
import { InlineKeyboard, TestType } from '../bot.service';
import { AdminClientService } from 'src/modules/admin-client/admin-client.service';
import { UIAdapterService } from '../services/ui-adapter.service';

interface TestSession {
  testType: string;
  currentQuestion: number;
  answers: { [key: string]: number };
  started_at: string;
}

@Injectable()
export class TestHandler {
  private readonly logger = new Logger(TestHandler.name);

  constructor(
    private readonly messageSender: MessageSender,
    private readonly userManager: UserManager,
    private readonly serviceIntegration: ServiceIntegration,
    private readonly adminClient: AdminClientService,
    private readonly uiAdapter: UIAdapterService,
  ) { }

  async handleCallback(maxUserId: string, params: string[]): Promise<void> {
    const action = params[0];

    this.logger.debug(`Test handler callback: action="${action}", params=${JSON.stringify(params)}`);

    switch (action) {
      case 'menu':
        await this.showTestMenu(maxUserId);
        break;
      case 'start':
        await this.startTest(maxUserId, params[1]);
        break;
      case 'answer':
        await this.handleAnswer(maxUserId, params[1], parseInt(params[2], 10));
        break;
      case 'snooze':
        await this.snoozeReminder(maxUserId, params[1]);
        break;
      case 'cancel':
        await this.cancelTest(maxUserId);
        break;
      default:
        this.logger.warn(`Unknown test action: ${action}`);
    }
  }

  async sendTestReminder(maxUserId: string, testType: TestType): Promise<void> {
    const testInfo = this.getTestInfo(testType);
    const text = `
⏰ **Напоминание о тесте**

Пора пройти тест "${testInfo.name}" ${testInfo.emoji}

Это займет всего 2 минуты и поможет мне лучше подобрать задачи под ваше состояние.
`;

    const keyboard: InlineKeyboard = {
      type: 'inline_keyboard',
      payload: {
        buttons: [
          [{ type: 'callback', text: '▶️ Пройти тест', payload: `test:start:${testType}` }],
          [{ type: 'callback', text: '⏰ Напомнить через 30 минут', payload: `test:snooze:${testType}` }],
        ],
      },
    };

    await this.messageSender.showScreen(maxUserId, text, keyboard);
  }

  private async showTestMenu(maxUserId: string): Promise<void> {
    const user = await this.userManager.getUserByMaxId(maxUserId);
    if (!user) {
      this.logger.error(`User not found for MAX ID: ${maxUserId}`);
      return;
    }

    try {
      const nextTest = await this.serviceIntegration.getNextAvailableTest(user.id);

      if (!nextTest) {
        const keyboard: InlineKeyboard = {
          type: 'inline_keyboard',
          payload: {
            buttons: [
              [{ type: 'callback', text: '↩️ Главное меню', payload: 'menu:main' }],
            ],
          },
        };

        await this.messageSender.showScreen(
          maxUserId,
          '✅ Вы уже прошли все тесты на сегодня!\n\nСледующий тест будет доступен завтра.',
          keyboard,
        );
        return;
      }

      const testInfo = this.getTestInfo(nextTest.type);
      const text = `
🧪 **Меню тестов**

Следующий доступный тест:

${testInfo.emoji} **${testInfo.name}**
${testInfo.description}

⏱️ Время: ~2 минуты
📊 Вопросов: 3
⏰ Рекомендуемое время: ${nextTest.scheduled_time || 'в любое время'}

${nextTest.available_now ? '✅ Доступен прямо сейчас' : '⏳ Будет доступен позже'}
`;

      const keyboard: InlineKeyboard = {
        type: 'inline_keyboard',
        payload: {
          buttons: [
            [{ type: 'callback', text: '▶️ Начать тест', payload: `test:start:${nextTest.type}` }],
            [{ type: 'callback', text: '↩️ Главное меню', payload: 'menu:main' }],
          ],
        },
      };

      await this.messageSender.showScreen(maxUserId, text, keyboard);
    } catch (error) {
      this.logger.error(`Error showing test menu: ${error.message}`, error.stack);
      await this.messageSender.showScreen(
        maxUserId,
        '❌ Ошибка при загрузке меню тестов. Попробуйте позже.',
      );
    }
  }

  private async startTest(maxUserId: string, testType: string): Promise<void> {
    const user = await this.userManager.getUserByMaxId(maxUserId);
    if (!user) {
      this.logger.error(`User not found for MAX ID: ${maxUserId}`);
      return;
    }

    try {
      this.logger.log(`Starting test "${testType}" for user ${user.id}`);

      const testStructure = await this.serviceIntegration.getTestStructure(testType);

      if (!testStructure || !testStructure.questions || testStructure.questions.length === 0) {
        throw new Error('Invalid test structure received');
      }

      const session: TestSession = {
        testType,
        currentQuestion: 1,
        answers: {},
        started_at: new Date().toISOString(),
      };

      await this.saveTestSession(maxUserId, session);
      await this.userManager.setUserState(maxUserId, 'in_test', 3600); // TTL 1 час

      await this.showQuestion(maxUserId, testStructure, 1, session);

      this.logger.log(`Test started successfully for user ${maxUserId}`);
    } catch (error) {
      this.logger.error(`Error starting test: ${error.message}`, error.stack);

      // Очистка состояния при ошибке
      await this.clearTestSession(maxUserId);
      await this.userManager.clearUserState(maxUserId);

      await this.messageSender.showScreen(
        maxUserId,
        '❌ Ошибка при запуске теста. Попробуйте позже.',
      );
    }
  }

  private async showQuestion(
    maxUserId: string,
    testStructure: any,
    questionNum: number,
    session: TestSession,
  ): Promise<void> {
    const question = testStructure.questions[questionNum - 1];

    if (!question) {
      this.logger.error(`Question ${questionNum} not found in test structure`);
      await this.cancelTest(maxUserId);
      return;
    }

    const text = `
${testStructure.emoji || '🧪'} **Тест "${testStructure.name}"**

Вопрос ${questionNum}/3

${question.emoji || '❓'} ${question.text}
`;

    const answerButtons = question.answers.map((answer) => [
      {
        type: 'callback' as const,
        text: `${answer.value} - ${answer.label}`,
        payload: `test:answer:${questionNum}:${answer.value}`,
      },
    ]);

    const keyboard: InlineKeyboard = {
      type: 'inline_keyboard',
      payload: {
        buttons: [
          ...answerButtons,
          [{ type: 'callback', text: '❌ Отменить тест', payload: 'test:cancel' }],
        ],
      },
    };

    await this.messageSender.showScreen(maxUserId, text, keyboard);
  }

  private async handleAnswer(
    maxUserId: string,
    questionNum: string,
    answerValue: number,
  ): Promise<void> {
    const session = await this.getTestSession(maxUserId);

    if (!session) {
      this.logger.warn(`Test session not found for user ${maxUserId}`);
      await this.messageSender.showScreen(
        maxUserId,
        '❌ Сессия теста не найдена. Начните тест заново через /test',
      );
      await this.userManager.clearUserState(maxUserId);
      return;
    }

    try {
      // Сохраняем ответ
      session.answers[`q${questionNum}`] = answerValue;
      session.currentQuestion = parseInt(questionNum, 10) + 1;
      await this.saveTestSession(maxUserId, session);

      this.logger.debug(`Answer saved: question ${questionNum}, value ${answerValue}`);

      // Проверяем, завершен ли тест
      if (session.currentQuestion > 3) {
        await this.submitTest(maxUserId, session);
      } else {
        const testStructure = await this.serviceIntegration.getTestStructure(session.testType);
        await this.showQuestion(maxUserId, testStructure, session.currentQuestion, session);
      }
    } catch (error) {
      this.logger.error(`Error handling answer: ${error.message}`, error.stack);
      await this.messageSender.showScreen(
        maxUserId,
        '❌ Ошибка при обработке ответа. Попробуйте еще раз.',
      );
    }
  }

  private async submitTest(maxUserId: string, session: TestSession): Promise<void> {
    const user = await this.userManager.getUserByMaxId(maxUserId);
    if (!user) {
      this.logger.error(`User not found for MAX ID: ${maxUserId}`);
      return;
    }

    await this.messageSender.showScreen(maxUserId, '⏳ Обрабатываю ваши ответы...');

    try {
      this.logger.log(`Submitting test for user ${user.id}, type: ${session.testType}`);

      // Отправляем тест в state-service
      const result = await this.serviceIntegration.submitTest(
        user.id,
        session.testType,
        session.answers,
      );

      this.logger.log(`Test submitted successfully for user ${user.id}`);
      this.logger.debug(`Result: ${JSON.stringify({
        test_type: result.test_type,
        score: result.result?.score,
        ui_mode: result.updated_state?.ui_mode
      })}`);

      // Очищаем локальную сессию теста
      await this.clearTestSession(maxUserId);
      await this.userManager.clearUserState(maxUserId);

      // КРИТИЧНО: Получаем СВЕЖЕЕ состояние из state-service
      let updatedState;
      try {
        updatedState = await this.serviceIntegration.getCurrentState(user.id);
        this.logger.log(`Fresh state received: ${JSON.stringify(updatedState)}`);
      } catch (stateError) {
        this.logger.error(`Error fetching updated state: ${stateError.message}`);
        updatedState = result.updated_state || this.getDefaultState();
      }

      // Обновляем UI режим пользователя в базе
      if (updatedState.ui_mode) {
        try {
          await this.adminClient.dbUpdate('users', user.id, {
            ui_mode: updatedState.ui_mode,
            last_test_at: new Date().toISOString(),
          });
          this.logger.log(`User UI mode updated to: ${updatedState.ui_mode}`);
        } catch (dbError) {
          this.logger.error(`Error updating user UI mode: ${dbError.message}`);
        }
      }

      // Отправляем webhook уведомление
      try {
        await this.serviceIntegration.sendWebSocketEvent(
          user.id,
          'test:completed',
          {
            testType: session.testType,
            result,
            timestamp: new Date().toISOString(),
          },
        );
      } catch (wsError) {
        this.logger.warn(`WebSocket notification failed: ${wsError.message}`);
      }

      // Показываем результат с актуальным состоянием
      await this.showTestResult(maxUserId, {
        ...result,
        updated_state: updatedState,
      });

    } catch (error) {
      this.logger.error(`Error submitting test: ${error.message}`, error.stack);

      // ✅ ПРАВИЛЬНОЕ логирование Axios ошибок
      if (error.response) {
        // Сервер ответил с кодом ошибки
        this.logger.error(`HTTP Status: ${error.response.status}`);
        this.logger.error(`Response data: ${JSON.stringify(error.response.data)}`);
      } else if (error.request) {
        // Запрос отправлен, но ответа нет
        this.logger.error(`No response received from server`);
        this.logger.error(`Request URL: ${error.config?.url}`);
      } else {
        // Ошибка при настройке запроса
        this.logger.error(`Error: ${error.message}`);
      }

      // При ошибке очищаем состояние
      await this.clearTestSession(maxUserId);
      await this.userManager.clearUserState(maxUserId);

      await this.messageSender.showScreen(
        maxUserId,
        '❌ Ошибка при обработке теста. Попробуйте позже.',
      );
    }
  }

  private async showTestResult(maxUserId: string, result: any): Promise<void> {
    const testInfo = this.getTestInfo(result.test_type);

    // Безопасное получение updated_state с fallback
    const updatedState = result.updated_state || this.getDefaultState();

    const text = `
${testInfo.emoji} **Результат теста "${testInfo.name}"**

📊 **Ваш результат:** ${result.result?.score || 'N/A'}${result.test_type === 'focus' ? '%' : '/10'}

💡 **Интерпретация:**
${result.result?.interpretation || 'Результаты обработаны'}

📈 **Обновленное состояние:**
⚡ Энергия: ${updatedState.energy || 5}/10
🎯 Фокус: ${updatedState.focus || 50}%
💪 Мотивация: ${updatedState.motivation || 5}/10
😰 Стресс: ${updatedState.stress || 5}/10

${this.getUIModeDescription(updatedState.ui_mode || 'NORMAL')}
`;

    // Адаптивные кнопки в зависимости от UI режима
    const buttons = this.getAdaptiveButtons(updatedState.ui_mode || 'NORMAL');

    const keyboard: InlineKeyboard = {
      type: 'inline_keyboard',
      payload: { buttons },
    };

    await this.messageSender.showScreen(maxUserId, text, keyboard);
  }

  private async cancelTest(maxUserId: string): Promise<void> {
    this.logger.log(`Test cancelled by user ${maxUserId}`);

    // Очистить сессию теста
    await this.clearTestSession(maxUserId);

    // Очистить состояние пользователя
    await this.userManager.clearUserState(maxUserId);

    const keyboard: InlineKeyboard = {
      type: 'inline_keyboard',
      payload: {
        buttons: [
          [{ type: 'callback', text: '↩️ Главное меню', payload: 'menu:main' }],
          [{ type: 'callback', text: '🧪 Тесты', payload: 'test:menu' }],
        ],
      },
    };

    await this.messageSender.showScreen(
      maxUserId,
      '❌ Тест отменён.\n\nВы можете пройти его позже.',
      keyboard,
    );
  }

  private async snoozeReminder(maxUserId: string, testType: string): Promise<void> {
    await this.messageSender.showScreen(
      maxUserId,
      '⏰ Хорошо, я напомню вам через 30 минут.',
    );
    this.logger.debug(`Snoozed ${testType} test for user ${maxUserId}`);

    // TODO: Добавить реальное планирование напоминания через scheduler
  }

  // ==================== Адаптивный UI ====================

  private getAdaptiveButtons(uiMode: string): any[][] {
    switch (uiMode) {
      case 'PEAK':
        return [
          [
            { type: 'callback', text: '🔥 Deep Work', payload: 'task:list:complex' },
            { type: 'callback', text: '🎯 MIT', payload: 'mit:show' },
          ],
          [{ type: 'callback', text: '↩️ Главное меню', payload: 'menu:main' }],
        ];

      case 'LOW':
        return [
          [
            { type: 'callback', text: '📝 Лёгкие задачи', payload: 'task:list:simple' },
            { type: 'callback', text: '☕ Перерыв', payload: 'stress:rest' },
          ],
          [{ type: 'callback', text: '↩️ Главное меню', payload: 'menu:main' }],
        ];

      case 'CRITICAL':
        return [
          [
            { type: 'callback', text: '🧘 Дыхание', payload: 'stress:breathing' },
            { type: 'callback', text: '🚶 Отдых', payload: 'stress:rest' },
          ],
          [{ type: 'callback', text: '↩️ Главное меню', payload: 'menu:main' }],
        ];

      default: // NORMAL
        return [
          [
            { type: 'callback', text: '🎯 Показать MIT', payload: 'mit:show' },
            { type: 'callback', text: '📋 Мои задачи', payload: 'task:list' },
          ],
          [{ type: 'callback', text: '↩️ Главное меню', payload: 'menu:main' }],
        ];
    }
  }

  // ==================== Session Management ====================

  private async saveTestSession(maxUserId: string, session: TestSession): Promise<void> {
    try {
      await this.adminClient.redisSet(
        `test_session:${maxUserId}`,
        JSON.stringify(session),
        1800, // 30 минут
      );
      this.logger.debug(`Test session saved for user ${maxUserId}`);
    } catch (error) {
      this.logger.error(`Error saving test session: ${error.message}`);
      throw error;
    }
  }

  private async getTestSession(maxUserId: string): Promise<TestSession | null> {
    try {
      const sessionStr = await this.adminClient.redisGet(`test_session:${maxUserId}`);
      return sessionStr ? JSON.parse(sessionStr) : null;
    } catch (error) {
      this.logger.error(`Error getting test session: ${error.message}`);
      return null;
    }
  }

  private async clearTestSession(maxUserId: string): Promise<void> {
    try {
      await this.adminClient.redisDel(`test_session:${maxUserId}`);
      this.logger.debug(`Test session cleared for user ${maxUserId}`);
    } catch (error) {
      this.logger.error(`Error clearing test session: ${error.message}`);
    }
  }

  // ==================== Helpers ====================

  private getTestInfo(testType: string): any {
    const map = {
      energy: { name: 'Энергия', emoji: '⚡', description: 'Оценка физического состояния' },
      focus: { name: 'Фокус', emoji: '🎯', description: 'Способность концентрироваться' },
      motivation: { name: 'Мотивация', emoji: '💪', description: 'Желание работать' },
      stress: { name: 'Стресс', emoji: '😰', description: 'Уровень напряжения' },
    };
    return map[testType] || map.energy;
  }

  private getUIModeDescription(mode: string): string {
    const descriptions = {
      PEAK: '🚀 **Пиковая продуктивность!** Отличное время для сложных задач.',
      NORMAL: '✅ **Нормальное состояние.** Можете работать над обычными задачами.',
      LOW: '⚠️ **Сниженная продуктивность.** Рекомендуются легкие задачи.',
      CRITICAL: '🚨 **Критическое состояние!** Необходим отдых.',
    };
    return descriptions[mode] || descriptions.NORMAL;
  }

  private getDefaultState(): any {
    return {
      energy: 5,
      focus: 50,
      motivation: 5,
      stress: 5,
      ui_mode: 'NORMAL',
    };
  }
}
