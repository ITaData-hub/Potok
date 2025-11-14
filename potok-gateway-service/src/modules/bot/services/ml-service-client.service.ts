// src/modules/bot/services/ml-service-client.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import {
  MLPredictionRequest,
  MLPredictionResponse,
  MLFineTuneRequest,
  MLFineTuneResponse,
  MLBatchPredictionRequest,
  MLBatchPredictionResponse,
} from '../types/ml-service.types';

@Injectable()
export class MlServiceClient {
  private readonly logger = new Logger(MlServiceClient.name);
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly retries: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.baseUrl =
      this.configService.get<string>('ML_SERVICE_URL') ||
      'http://localhost:3004/api/v1';
    this.timeout = this.configService.get<number>('ML_SERVICE_TIMEOUT') || 10000;
    this.retries = this.configService.get<number>('ML_SERVICE_RETRIES') || 3;
  }

  /**
   * Предсказание для одной задачи
   */
  async predict(text: string): Promise<MLPredictionResponse> {
    this.logger.debug(`🤖 Отправка запроса на предсказание: "${text.substring(0, 50)}..."`);

    const request: MLPredictionRequest = { text };

    try {
      const response = await this.makeRequest<MLPredictionResponse>(
        'POST',
        '/predict/',
        request,
      );

      this.logger.log(
        `✅ Получен ответ от ML-сервиса: ${response.name} (confidence: ${response.confidence})`,
      );

      return response;
    } catch (error) {
      this.logger.error(`❌ Ошибка при предсказании: ${error.message}`, error.stack);
      throw new Error(`Не удалось получить предсказание от ML-сервиса: ${error.message}`);
    }
  }

  /**
   * Пакетное предсказание
   */
  async predictBatch(texts: string[]): Promise<MLBatchPredictionResponse> {
    this.logger.debug(`🤖 Отправка пакетного запроса: ${texts.length} задач`);

    const request: MLBatchPredictionRequest = { texts };

    try {
      const response = await this.makeRequest<MLBatchPredictionResponse>(
        'POST',
        '/predict/batch',
        request,
      );

      this.logger.log(
        `✅ Обработано: ${response.successful}/${response.total} задач`,
      );

      return response;
    } catch (error) {
      this.logger.error(`❌ Ошибка пакетного предсказания: ${error.message}`);
      throw new Error(`Ошибка пакетного предсказания: ${error.message}`);
    }
  }

  /**
   * Дообучение модели
   */
  async fineTune(request: MLFineTuneRequest): Promise<MLFineTuneResponse> {
    this.logger.debug(
      `🎓 Отправка запроса на дообучение: ${request.training_examples.length} примеров`,
    );

    try {
      const response = await this.makeRequest<MLFineTuneResponse>(
        'POST',
        '/training/fine-tune',
        request,
      );

      this.logger.log(
        `✅ Дообучение запущено: ${response.training_id} (${response.total_examples} примеров, ${response.epochs} эпох)`,
      );

      return response;
    } catch (error) {
      this.logger.error(`❌ Ошибка при дообучении: ${error.message}`);
      throw new Error(`Не удалось запустить дообучение: ${error.message}`);
    }
  }

  /**
   * Проверка доступности ML-сервиса
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.makeRequest('GET', '/monitoring/ping');
      this.logger.log('✅ ML-сервис доступен');
      return true;
    } catch (error) {
      this.logger.warn(`⚠️ ML-сервис недоступен: ${error.message}`);
      return false;
    }
  }

  /**
   * Внутренний метод для HTTP запросов с повторами
   */
  private async makeRequest<T>(
    method: 'GET' | 'POST',
    endpoint: string,
    data?: any,
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    let lastError: Error = new Error;

    for (let attempt = 1; attempt <= this.retries; attempt++) {
      try {
        this.logger.debug(`📡 Попытка ${attempt}/${this.retries}: ${method} ${url}`);

        const config = {
          timeout: this.timeout,
          headers: {
            'Content-Type': 'application/json',
          },
        };

        const response =
          method === 'GET'
            ? await firstValueFrom(this.httpService.get<T>(url, config))
            : await firstValueFrom(this.httpService.post<T>(url, data, config));

        return response.data;
      } catch (error) {
        lastError = error;
        this.logger.warn(
          `⚠️ Попытка ${attempt} не удалась: ${error.message}`,
        );

        if (attempt < this.retries) {
          // Exponential backoff
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          this.logger.debug(`⏳ Ожидание ${delay}ms перед следующей попыткой...`);
          await this.sleep(delay);
        }
      }
    }

    throw lastError;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
