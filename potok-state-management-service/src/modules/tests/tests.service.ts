import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { AdminClientService } from '../admin-client/admin-client.service';
import { TestCalculatorService, TestAnswers } from './services/test-calculator.service';
import { ALL_TESTS } from './structures/test-structures';
import { UiModeService } from '../state/services/ui-mode.service';
import { CircadianService } from '../state/services/circadian.service';
import { RecommendationsService } from '@modules/recommendations/recommendations.service';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

interface TestConfig {
  type: string;
  name: string;
  emoji: string;
  description: string;
  questions: any[];
  formula: any;
}

interface AllTestsType {
  [key: string]: TestConfig;
  energy: TestConfig;
  focus: TestConfig;
  motivation: TestConfig;
  stress: TestConfig;
}

@Injectable()
export class TestsService {
  private readonly logger = new Logger(TestsService.name);

  constructor(
    private readonly adminClient: AdminClientService,
    private readonly testCalculator: TestCalculatorService,
    private readonly uiModeService: UiModeService,
    private readonly circadianService: CircadianService,
    private readonly recommendationsService: RecommendationsService,
    private readonly httpService: HttpService,
  ) {}

  /**
   * Получить структуру теста
   */
  async getTestStructure(testType: string): Promise<any> {
    switch(testType){
      case 'energy':
        return ALL_TESTS.energy;
      case 'focus':
        return ALL_TESTS.focus;
      case 'motivation':
        return ALL_TESTS.motivation;
      case 'stress':
        return ALL_TESTS.stress;
    }
    let test = null
    if (!test) {
      throw new BadRequestException(`Unknown test type: ${testType}`);
    }

    return test;
  }

  /**
   * Получить следующий доступный тест для пользователя
   */
  async getNextAvailableTest(userId: string): Promise<any> {
    try {
      // Получаем все тесты пользователя за сегодня
      const today = new Date();
      today.setHours(0, 0, 0, 0);
  
      const todayTests = await this.adminClient.dbList('user-states', {
        user_id: userId,
        created_at_gte: today.toISOString(),
      });
  
      // ===== УЛУЧШЕННАЯ ОБРАБОТКА =====
      this.logger.log(`=== Test Availability Check ===`);
      this.logger.log(`Raw response type: ${typeof todayTests}`);
      this.logger.log(`Raw response: ${JSON.stringify(todayTests)}`);
      this.logger.log(`Is array: ${Array.isArray(todayTests)}`);
      
      // ИСПРАВЛЕНИЕ: Обрабатываем все возможные типы ответа
      let testsArray: any[] = [];
      
      if (Array.isArray(todayTests)) {
        testsArray = todayTests;
      } else if (typeof todayTests === 'string') {
        // Если вернулась строка (например, ""), парсим или возвращаем []
        if (todayTests === '' || todayTests === '[]') {
          testsArray = [];
        } else {
          try {
            testsArray = JSON.parse(todayTests);
          } catch {
            this.logger.warn(`Cannot parse response as JSON: ${todayTests}`);
            testsArray = [];
          }
        }
      } else if (todayTests === null || todayTests === undefined) {
        testsArray = [];
      } else if (typeof todayTests === 'object' && 'data' in todayTests) {
        // ИСПРАВЛЕНИЕ: используем type guard 'in' вместо прямого доступа
        const response = todayTests as any; // type assertion
        testsArray = Array.isArray(response.data) ? response.data : [];
      }
      
      this.logger.log(`Parsed tests array length: ${testsArray.length}`);
  
      const completedTypes = new Set(testsArray.map((t) => t.test_type));
  
      this.logger.log(`Completed types: [${Array.from(completedTypes).join(', ')}]`);
  
      // Расписание тестов с временными окнами
      const testSchedule = [
        { type: 'energy', time: '08:00', hour: 8 },
        { type: 'focus', time: '12:00', hour: 12 },
        { type: 'motivation', time: '15:00', hour: 15 },
        { type: 'stress', time: '18:00', hour: 18 },
      ];
  
      const currentHour = new Date().getHours();
      this.logger.log(`Current hour: ${currentHour}`);
  
      // Находим следующий доступный тест
      for (const test of testSchedule) {
        if (!completedTypes.has(test.type) && currentHour >= test.hour - 1) {
          this.logger.log(`✅ Next available test: ${test.type}`);
          return {
            type: test.type,
            scheduled_time: test.time,
            available_now: currentHour >= test.hour - 1 && currentHour <= test.hour + 1,
          };
        }
      }
  
      this.logger.log(`❌ All tests completed today`);
      return null; // Все тесты пройдены
    } catch (error) {
      this.logger.error(`Error getting next test: ${error.message}`, error.stack);
      throw error;
    }
  }
  
  

  /**
   * Отправить ответы на тест и рассчитать состояние
   */
  async submitTest(userId: string, dto: any): Promise<any> {
    this.logger.debug(`Processing test submission for user ${userId}, type: ${dto.testType}`);

    const { testType, answers } = dto;

    // НОВОЕ: Проверка на дублирование
    const alreadyTaken = await this.checkTestAlreadyTaken(userId, testType);
    if (alreadyTaken) {
      throw new BadRequestException(
        `Вы уже проходили тест "${testType}" сегодня. ` +
        `Следующий тест будет доступен завтра.`
      );
    }
  
    // НОВОЕ: Валидация временного окна
    this.validateTestTimeWindow(testType);

    // Валидация типа теста
    if (!this.getTestStructure(testType)) {
      throw new BadRequestException(`Invalid test type: ${testType}`);
    }

    // Валидация ответов
    if (
      !answers ||
      typeof answers.q1 !== 'number' ||
      typeof answers.q2 !== 'number' ||
      typeof answers.q3 !== 'number'
  ) {
    throw new BadRequestException('Missing required answers (q1, q2, q3)');
  }

    const testAnswers: TestAnswers = {
      q1: answers.q1,
      q2: answers.q2,
      q3: answers.q3,
    };


    try {
      // Рассчитываем score в зависимости от типа теста
      let result;
      switch (testType) {
        case 'energy':
          result = this.testCalculator.calculateEnergyScore(testAnswers);
          break;
        case 'focus':
          result = this.testCalculator.calculateFocusScore(testAnswers);
          break;
        case 'motivation':
          result = this.testCalculator.calculateMotivationScore(testAnswers);
          break;
        case 'stress':
          result = this.testCalculator.calculateStressScore(testAnswers);
          break;
        default:
          throw new BadRequestException(`Unknown test type: ${testType}`);
      }

      // Получаем текущее состояние пользователя
      const currentState = await this.getCurrentOrCreateState(userId);

      // Обновляем соответствующую метрику
      const updatedState = { ...currentState };
      updatedState[testType] = result.score;

      // Определяем UI Mode
      const uiMode = this.uiModeService.determineUIMode({
        energy: updatedState.energy,
        focus: updatedState.focus,
        motivation: updatedState.motivation,
        stress: updatedState.stress,
      });

      // Сохраняем новое состояние в БД
      const savedState = await this.adminClient.dbCreate('user-states', {
        user_id: userId,
        test_type: testType,
        energy: updatedState.energy,
        focus: updatedState.focus,
        motivation: updatedState.motivation,
        stress: updatedState.stress,
        test_count_today: (currentState.test_count_today || 0) + 1,
        created_at: new Date().toISOString(),
      });

      // Публикуем событие в Redis для других сервисов
      await this.publishStateUpdateEvent(userId, updatedState, uiMode);

      // Отправляем webhook на Gateway
      await this.sendWebhookToGateway(userId, updatedState, uiMode);

      this.logger.log(`Test ${testType} submitted for user ${userId}: score=${result.score}`);

      const recommendations = await this.recommendationsService.generateRecommendations({
        ...updatedState,
        ui_mode: uiMode,
      });
    
      return {
        success: true,
        test_type: testType,
        result: {
          score: result.score,
          interpretation: result.interpretation,
          details: result.details,
        },
        updated_state: {
          energy: updatedState.energy,
          focus: updatedState.focus,
          motivation: updatedState.motivation,
          stress: updatedState.stress,
          ui_mode: uiMode,
        },
        // НОВОЕ: рекомендации
        recommendations: recommendations.recommendations,
        work_mode: recommendations.work_mode,
        break_needed: recommendations.break_needed,
        break_duration: recommendations.break_duration,
        stress_relief_exercises: recommendations.stress_relief_exercises,
        next_test_time: recommendations.next_test_time,
        submitted_at: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Error submitting test: ${error.message}`);
      throw error;
    }
  }

  // ==================== Вспомогательные методы ====================

  private async getCurrentOrCreateState(userId: string): Promise<any> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
  
      const todayTests = await this.adminClient.dbList('user-states', {
        user_id: userId,
        created_at_gte: today.toISOString(),
      });
  
      const testsArray = Array.isArray(todayTests) ? todayTests : [];
      
      if (testsArray.length === 0) {
        return {
          energy: 5,
          focus: 50,
          motivation: 5,
          stress: 5,
          test_count_today: 0,
        };
      }
  
      // НОВОЕ: Агрегация по типам тестов
      const latestByType: Record<string, any> = {};
      
      for (const test of testsArray) {
        const testType = test.test_type;
        const testTime = new Date(test.created_at).getTime();
        
        if (!latestByType[testType] || 
            new Date(latestByType[testType].created_at).getTime() < testTime) {
          latestByType[testType] = test;
        }
      }
  
      return {
        energy: latestByType['energy']?.energy ?? 5,
        focus: latestByType['focus']?.focus ?? 50,
        motivation: latestByType['motivation']?.motivation ?? 5,
        stress: latestByType['stress']?.stress ?? 5,
        test_count_today: testsArray.length,
      };
    } catch (error) {
      this.logger.error(`Error getting current state: ${error.message}`);
      return {
        energy: 5,
        focus: 50,
        motivation: 5,
        stress: 5,
        test_count_today: 0,
      };
    }
  }

  private async publishStateUpdateEvent(userId: string, state: any, uiMode: string): Promise<void> {
    try {
      await this.adminClient.redisPublish('state:updated', {
        userId,
        energy: state.energy,
        focus: state.focus,
        motivation: state.motivation,
        stress: state.stress,
        ui_mode: uiMode,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(`Error publishing state update: ${error.message}`);
    }
  }

  private async checkTestAlreadyTaken(userId: string, testType: string): Promise<boolean> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
  
    const existingTests = await this.adminClient.dbList('user-states', {
      user_id: userId,
      test_type: testType,
      created_at_gte: today.toISOString(),
    });
  
    const testsArray = Array.isArray(existingTests) ? existingTests : [];
    return testsArray.length > 0;
  }
  
  // ДОБАВИТЬ валидацию временного окна
  private validateTestTimeWindow(testType: string): void {
    // const currentHour = new Date().getHours();
  
    // // Явная типизация для избежания ошибки индексации
    // const timeWindows: Record<string, { start: number; end: number; label: string }> = {
    //   energy: { start: 7, end: 10, label: '08:00-09:00' },
    //   focus: { start: 11, end: 14, label: '12:00-13:00' },
    //   motivation: { start: 14, end: 17, label: '15:00-16:00' },
    //   stress: { start: 17, end: 20, label: '18:00-19:00' },
    // };
  
    // const window = timeWindows[testType];
    // if (!window) {
    //   throw new BadRequestException(`Unknown test type: ${testType}`);
    // }
  
    // if (currentHour < window.start || currentHour >= window.end) {
    //   throw new BadRequestException(
    //     `Тест "${testType}" доступен только в ${window.label}. ` +
    //     `Текущее время: ${currentHour}:00. Попробуйте позже.`
    //   );
    // }
  
    // this.logger.debug(`Test ${testType} is within time window (hour: ${currentHour})`);
  }
  
  
  private async sendWebhookToGateway(
    userId: string, 
    state: any, 
    uiMode: string
  ): Promise<void> {
    const gatewayUrl = process.env.GATEWAY_WEBHOOK_URL || 'http://localhost:3001';
    const webhookEndpoint = `${gatewayUrl}/api/v1/webhook/state-updated`;
  
    this.logger.log(`Attempting to send webhook to: ${webhookEndpoint}`); // ДОБАВИТЬ
  
    const payload = {
      userId,
      energy: state.energy,
      focus: state.focus,
      motivation: state.motivation,
      stress: state.stress,
      ui_mode: uiMode,
      timestamp: new Date().toISOString(),
    };
  
    const maxRetries = 3;
    let lastError: Error | null = null;
  
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await firstValueFrom(
          this.httpService.post(webhookEndpoint, payload, {
            timeout: 5000,
            headers: {
              'Content-Type': 'application/json',
              'X-Service-Name': 'state-management',
            },
          })
        );
  
        this.logger.log(`✅ Webhook sent to Gateway for user ${userId}`);
        return;
  
      } catch (error) {
        lastError = error as Error;
        
        // ✅ УЛУЧШЕННОЕ ЛОГИРОВАНИЕ
        if (error.response) {
          this.logger.warn(
            `Webhook attempt ${attempt} failed: HTTP ${error.response.status} - ${JSON.stringify(error.response.data)}`
          );
        } else if (error.request) {
          this.logger.warn(
            `Webhook attempt ${attempt} failed: No response from ${webhookEndpoint} (connection timeout/refused)`
          );
        } else {
          this.logger.warn(
            `Webhook attempt ${attempt} failed: ${error.message}`
          );
        }
  
        if (attempt < maxRetries) {
          const delayMs = Math.pow(2, attempt - 1) * 1000;
          this.logger.debug(`Retrying in ${delayMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
    }
  
    if (lastError) {
      this.logger.error(
        `❌ Failed to send webhook to ${webhookEndpoint} after ${maxRetries} attempts: ${lastError.message}`
      );
    }
  }
  
}
