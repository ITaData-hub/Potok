// src/modules/gateway/circuit-breaker.controller.ts
import { 
    Controller, 
    Get, 
    Post, 
    Param, 
    UseGuards, 
    NotFoundException 
  } from '@nestjs/common';
  import {
    ApiTags,
    ApiOperation,
    ApiBearerAuth,
    ApiResponse,
    ApiParam,
    ApiOkResponse,
  } from '@nestjs/swagger';
  import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
  import { CircuitBreakerService } from './circuit-breaker.service';
  import {
    CircuitInfoDto,
    CircuitStatusDto,
    CircuitResetResponseDto,
  } from './dto/circuit-breaker-response.dto';
  
  @ApiTags('circuit-breaker')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Controller('circuit-breaker')
  export class CircuitBreakerController {
    constructor(private readonly circuitBreakerService: CircuitBreakerService) {}
  
    @Get('status')
    @ApiOperation({ summary: 'Get status of all circuit breakers' })
    @ApiOkResponse({
      description: 'Returns status of all circuit breakers',
      schema: {
        type: 'object',
        additionalProperties: {
          type: 'object',
          properties: {
            state: {
              type: 'string',
              enum: ['CLOSED', 'OPEN', 'HALF_OPEN'],
            },
            failureCount: { type: 'number' },
            successCount: { type: 'number' },
            lastFailure: { type: 'string', format: 'date-time' },
            lastSuccess: { type: 'string', format: 'date-time' },
          },
        },
        example: {
          'user-service': {
            state: 'CLOSED',
            failureCount: 0,
            successCount: 0,
            lastFailure: '2025-11-03T19:12:27.124Z',
            lastSuccess: '2025-11-04T10:30:00.000Z',
          },
          'product-service': {
            state: 'OPEN',
            failureCount: 5,
            successCount: 0,
            lastFailure: '2025-11-04T10:45:00.000Z',
            lastSuccess: '2025-11-04T10:30:00.000Z',
          },
        },
      },
    })
    getAllCircuitStatus(): Record<string, CircuitStatusDto> {
      const circuits = this.circuitBreakerService.getAllCircuitsInfo();
      const status: Record<string, CircuitStatusDto> = {};
  
      circuits.forEach((circuit, serviceName) => {
        status[serviceName] = {
          state: circuit.state,
          failureCount: circuit.failureCount,
          successCount: circuit.successCount,
        };
      });
  
      return status;
    }
  
    @Get('status/:service')
    @ApiOperation({ summary: 'Get circuit breaker status for specific service' })
    @ApiParam({ 
      name: 'service', 
      description: 'Service name',
      example: 'user-service' 
    })
    @ApiOkResponse({
      description: 'Returns circuit breaker info for the service',
      type: CircuitInfoDto,
    })
    @ApiResponse({
      status: 404,
      description: 'Circuit breaker not found for the service',
    })
    getCircuitStatus(@Param('service') service: string): CircuitInfoDto {
      const info = this.circuitBreakerService.getCircuitInfo(service);
      
      if (!info) {
        throw new NotFoundException(
          `Circuit breaker not found for service: ${service}`,
        );
      }
  
      return info;
    }
  
    @Post('reset/:service')
    @ApiOperation({ summary: 'Reset circuit breaker for specific service' })
    @ApiParam({ 
      name: 'service', 
      description: 'Service name to reset',
      example: 'user-service' 
    })
    @ApiOkResponse({
      description: 'Circuit breaker reset successfully',
      type: CircuitResetResponseDto,
    })
    resetCircuit(@Param('service') service: string): CircuitResetResponseDto {
      this.circuitBreakerService.resetCircuit(service);
      return {
        message: `Circuit breaker reset for ${service}`,
        service,
      };
    }
  
    @Post('reset')
    @ApiOperation({ summary: 'Reset all circuit breakers' })
    @ApiOkResponse({
      description: 'All circuit breakers reset successfully',
      type: CircuitResetResponseDto,
    })
    resetAllCircuits(): CircuitResetResponseDto {
      this.circuitBreakerService.resetAllCircuits();
      return {
        message: 'All circuit breakers reset',
      };
    }
  }
  