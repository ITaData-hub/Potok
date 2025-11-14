import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { GatewayService } from './gateway.service';
import { CircuitBreakerService } from './circuit-breaker.service';

@Controller('gateway')
export class GatewayController {
  constructor(
    private readonly gatewayService: GatewayService,
    private readonly circuitBreaker: CircuitBreakerService,
  ) {}

  /**
   * Health check всех микросервисов
   */
  @Get('health')
  async healthCheck() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'gateway',
    };
  }

  /**
   * Статус circuit breakers
   */
  @Get('circuits')
  getCircuitStatus() {
    const circuits = this.circuitBreaker.getAllCircuitsInfo();
    const result: any = {};
    
    circuits.forEach((status, name) => {
      result[name] = {
        state: status.state,
        failureCount: status.failureCount,
        successCount: status.successCount,
        lastFailure: status.lastFailureTime || null,
        lastSuccess: status.lastSuccessTime || null,
        nextAttempt: status.nextAttemptTime || null,
      };
    });
    
    return result;
  }

  /**
   * Статус конкретного circuit breaker
   */
  @Get('circuits/:service')
  getServiceCircuit(@Param('service') service: string) {
    const info = this.circuitBreaker.getCircuitInfo(service);
    
    if (!info) {
      return {
        service,
        state: 'CLOSED',
        failureCount: 0,
        successCount: 0,
        lastFailure: null,
        lastSuccess: null,
        nextAttempt: null,
      };
    }
    
    return {
      service,
      state: info.state,
      failureCount: info.failureCount,
      successCount: info.successCount,
      lastFailure: info.lastFailureTime || null,
      lastSuccess: info.lastSuccessTime || null,
      nextAttempt: info.nextAttemptTime || null,
    };
  }

  /**
   * Сброс circuit breaker
   */
  @Post('circuits/:service/reset')
  @HttpCode(HttpStatus.OK)
  resetCircuit(@Param('service') service: string) {
    this.circuitBreaker.resetCircuit(service);
    return { 
      message: `Circuit ${service} сброшен`,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Сброс всех circuit breakers
   */
  @Post('circuits/reset-all')
  @HttpCode(HttpStatus.OK)
  resetAllCircuits() {
    this.circuitBreaker.resetAllCircuits();
    return { 
      message: 'Все circuits сброшены',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Агрегированный запрос данных пользователя
   */
  @Get('aggregate/user/:userId')
  async aggregateUserData(@Param('userId') userId: string) {
    try {
      const data = await this.gatewayService.aggregateData(userId);
      return data;
    } catch (error) {
      return {
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Инвалидация кэша сервиса
   */
  @Post('cache/:service/invalidate')
  @HttpCode(HttpStatus.OK)
  async invalidateCache(
    @Param('service') service: string,
    @Query('pattern') pattern?: string,
  ) {
    await this.gatewayService.invalidateCache(service, pattern || '*');
    return {
      message: `Кэш ${service} инвалидирован`,
      pattern: pattern || '*',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Параллельный запрос к нескольким эндпоинтам
   */
  @Post('parallel')
  @HttpCode(HttpStatus.OK)
  async executeParallel(@Body() body: {
    requests: Array<{
      service: string;
      endpoint: string;
      method: string;
      body?: any;
    }>
  }) {
    try {
      const results = await this.gatewayService.executeParallel(body.requests);
      return {
        results,
        count: results.length,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Проксирование запроса к микросервису
   */
  @Post('proxy/:service')
  @HttpCode(HttpStatus.OK)
  async proxyRequest(
    @Param('service') service: string,
    @Body() body: {
      path: string;
      method: string;
      data?: any;
    },
  ) {
    try {
      const result = await this.gatewayService.proxyToService(
        service,
        body.path,
        body.method,
        body.data,
      );
      return result;
    } catch (error) {
      return {
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }
}
