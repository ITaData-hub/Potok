import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { StateService } from './state.service';
import { Logger } from '@nestjs/common';

@Controller('api/v1/state')
export class StateController {
  private readonly logger = new Logger(StateController.name);

  constructor(private readonly stateService: StateService) {}

  // ИСПРАВЛЕНО: упростили маршрут
  @Get('user/:userId/current')
  async getCurrentState(@Param('userId') userId: string) {
    this.logger.log(`Getting current state for user ${userId}`);
    try {
      const state = await this.stateService.getCurrentState(userId);
      this.logger.log(`State retrieved successfully for user ${userId}`);
      return state;
    } catch (error) {
      this.logger.error(`Error getting state for user ${userId}: ${error.message}`);
      throw error;
    }
  }

  @Post('user/:userId/transition')
  async transitionState(
    @Param('userId') userId: string,
    @Body() body: any,
  ) {
    this.logger.log(`State transition for user ${userId}`);
    return await this.stateService.transitionState('user', userId, body);
  }

  @Get('user/:userId/history')
  async getStateHistory(@Param('userId') userId: string) {
    return await this.stateService.getStateHistory('user', userId);
  }

  @Get('available')
  async getAvailableStates() {
    return await this.stateService.getAvailableStates('user');
  }
}
