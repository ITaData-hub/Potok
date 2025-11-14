import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitStatus {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureTime?: number;
  lastSuccessTime?: number;
  nextAttemptTime?: number | null;
}

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private readonly circuits: Map<string, CircuitStatus> = new Map();
  private readonly failureThreshold: number;
  private readonly successThreshold: number;
  private readonly timeout: number;

  constructor(private readonly configService: ConfigService) {
    this.failureThreshold = this.configService.get<number>(
      'services.circuitBreaker.failureThreshold',
      5,
    );
    this.successThreshold = this.configService.get<number>(
      'services.circuitBreaker.successThreshold',
      2,
    );
    this.timeout = this.configService.get<number>(
      'services.circuitBreaker.timeout',
      60000,
    );
  }

  /**
   * Выполнить функцию через Circuit Breaker
   */
  async execute<T>(serviceName: string, fn: () => Promise<T>): Promise<T> {
    const circuit = this.getOrCreateCircuit(serviceName);

    if (circuit.state === CircuitState.OPEN) {
      const nextAttemptTime = circuit.nextAttemptTime || 0;
      if (Date.now() < nextAttemptTime) {
        throw new Error(`Circuit breaker OPEN for ${serviceName}`);
      }
      circuit.state = CircuitState.HALF_OPEN;
      circuit.successCount = 0;
      this.logger.log(`Circuit ${serviceName} переведен в HALF_OPEN`);
    }

    try {
      const result = await fn();
      this.onSuccess(serviceName);
      return result;
    } catch (error) {
      this.onFailure(serviceName);
      throw error;
    }
  }

  /**
   * Обработка успешного запроса
   */
  private onSuccess(serviceName: string): void {
    const circuit = this.circuits.get(serviceName);
    if (!circuit) return;

    circuit.failureCount = 0;
    circuit.lastSuccessTime = Date.now();

    if (circuit.state === CircuitState.HALF_OPEN) {
      circuit.successCount++;

      if (circuit.successCount >= this.successThreshold) {
        circuit.state = CircuitState.CLOSED;
        this.logger.log(`Circuit ${serviceName} закрыт (CLOSED)`);
      }
    }
  }

  /**
   * Обработка неудачного запроса
   */
  private onFailure(serviceName: string): void {
    const circuit = this.circuits.get(serviceName);
    if (!circuit) return;

    circuit.failureCount++;
    circuit.lastFailureTime = Date.now();

    if (circuit.failureCount >= this.failureThreshold) {
      circuit.state = CircuitState.OPEN;
      circuit.nextAttemptTime = Date.now() + this.timeout;
      this.logger.warn(
        `Circuit ${serviceName} открыт (OPEN) до ${new Date(circuit.nextAttemptTime).toISOString()}`,
      );
    }
  }

  /**
   * Получить или создать circuit
   */
  private getOrCreateCircuit(serviceName: string): CircuitStatus {
    if (!this.circuits.has(serviceName)) {
      this.circuits.set(serviceName, {
        state: CircuitState.CLOSED,
        failureCount: 0,
        successCount: 0,
      });
    }
    return this.circuits.get(serviceName)!;
  }

  /**
   * Получить статус circuit
   */
  getCircuitStatus(serviceName: string): CircuitStatus {
    const circuit = this.circuits.get(serviceName);
    if (!circuit) {
      return {
        state: CircuitState.CLOSED,
        failureCount: 0,
        successCount: 0,
      };
    }
    return circuit;
  }

  /**
   * Получить информацию о всех circuits
   */
  getAllCircuitsInfo(): Map<string, CircuitStatus> {
    return new Map(this.circuits);
  }

  /**
   * Получить информацию о конкретном circuit
   */
  getCircuitInfo(serviceName: string): CircuitStatus | null {
    return this.circuits.get(serviceName) || null;
  }

  /**
   * Сбросить circuit
   */
  resetCircuit(serviceName: string): void {
    this.circuits.delete(serviceName);
    this.logger.log(`Circuit ${serviceName} сброшен`);
  }

  /**
   * Сбросить все circuits
   */
  resetAllCircuits(): void {
    this.circuits.clear();
    this.logger.log('Все circuits сброшены');
  }
}
