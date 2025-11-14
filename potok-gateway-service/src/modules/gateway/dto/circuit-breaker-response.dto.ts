// src/modules/gateway/dto/circuit-breaker-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export class CircuitInfoDto {
  @ApiProperty({ 
    enum: CircuitState, 
    description: 'Current circuit state',
    example: CircuitState.CLOSED 
  })
  state: CircuitState;

  @ApiProperty({ 
    description: 'Number of consecutive failures',
    example: 0 
  })
  failureCount: number;

  @ApiProperty({ 
    description: 'Number of consecutive successes',
    example: 0 
  })
  successCount: number;

  @ApiProperty({ 
    description: 'Timestamp when next attempt is allowed',
    example: 1699027200000 
  })
  nextAttempt?: number | null;

  @ApiProperty({ 
    required: false, 
    description: 'Last failure timestamp',
    type: Date,
    example: '2025-11-03T19:12:27.124Z'
  })
  lastFailure?: Date;

  @ApiProperty({ 
    required: false, 
    description: 'Last success timestamp',
    type: Date,
    example: '2025-11-03T19:12:27.124Z'
  })
  lastSuccess?: Date;
}

export class CircuitStatusDto {
  @ApiProperty({ 
    enum: CircuitState,
    example: CircuitState.CLOSED 
  })
  state: CircuitState;

  @ApiProperty({ example: 0 })
  failureCount: number;

  @ApiProperty({ example: 0 })
  successCount: number;

  @ApiProperty({ 
    required: false,
    type: Date,
    example: '2025-11-03T19:12:27.124Z'
  })
  lastFailure?: Date;

  @ApiProperty({ 
    required: false,
    type: Date,
    example: '2025-11-03T19:12:27.124Z'
  })
  lastSuccess?: Date;
}

// Убираем проблемный класс AllCircuitsStatusDto
// Вместо него используем Record<string, CircuitStatusDto> напрямую

export class CircuitResetResponseDto {
  @ApiProperty({ example: 'Circuit breaker reset successfully' })
  message: string;

  @ApiProperty({ 
    required: false,
    example: 'user-service' 
  })
  service?: string;
}
