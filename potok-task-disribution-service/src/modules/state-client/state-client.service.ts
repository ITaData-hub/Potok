import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class StateClientService {
  private readonly logger = new Logger(StateClientService.name);
  private readonly stateServiceUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.stateServiceUrl = this.configService.get<string>('STATE_SERVICE_URL');
  }

  /**
   * Получить текущее состояние пользователя
   */
  async getCurrentState(userId: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.stateServiceUrl}/api/v1/state/user/${userId}/current`, {
          timeout: 5000,
        }),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Error fetching current state for user ${userId}: ${error.message}`);
      
      // Возвращаем дефолтное состояние при ошибке
      return this.getDefaultState();
    }
  }

  /**
   * Получить прогноз состояния
   */
  async getStateForecast(userId: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.stateServiceUrl}/api/v1/state/user/${userId}/forecast`, {
          timeout: 5000,
        }),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Error fetching forecast for user ${userId}: ${error.message}`);
      return null;
    }
  }

  /**
   * Дефолтное состояние при недоступности State Service
   */
  private getDefaultState(): any {
    return {
      energy: 5,
      focus: 50,
      motivation: 5,
      stress: 5,
      energy_adjusted: 5,
      focus_adjusted: 50,
      ui_mode: 'NORMAL',
      ui_mode_description: 'Нормальное состояние (по умолчанию)',
      circadian: {
        phase: 'NORMAL',
        description: 'Нормальная фаза',
        factor: 1.0,
        is_peak_time: false,
      },
      is_peak_time: false,
      peak_hours: [],
    };
  }
}
