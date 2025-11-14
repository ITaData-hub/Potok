import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ServiceIntegration } from '../../bot/services/service-integration.service';

@ApiTags('Gateway - State Proxy')
@Controller('api/v1/gateway/state')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class StateProxyController {
  constructor(private readonly serviceIntegration: ServiceIntegration) {}

  @Get('user/:userId/current')
  @ApiOperation({ summary: 'Get current state for user' })
  async getCurrentState(@Param('userId') userId: string) {
    return await this.serviceIntegration.getCurrentState(userId);
  }

  @Get('user/:userId/forecast')
  @ApiOperation({ summary: 'Get state forecast for user' })
  async getForecast(@Param('userId') userId: string) {
    return await this.serviceIntegration.getForecast(userId);
  }

  @Get('user/:userId/recommendations')
  @ApiOperation({ summary: 'Get recommendations for user' })
  async getRecommendations(@Param('userId') userId: string) {
    return await this.serviceIntegration.getRecommendations(userId);
  }

  @Post('user/:userId/test')
  @ApiOperation({ summary: 'Submit test for user' })
  async submitTest(
    @Param('userId') userId: string,
    @Body() body: { testType: string; answers: any },
  ) {
    return await this.serviceIntegration.submitTest(
      userId,
      body.testType,
      body.answers,
    );
  }
}
