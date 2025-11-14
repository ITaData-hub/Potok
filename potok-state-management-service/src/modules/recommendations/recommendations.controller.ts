import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { RecommendationsService } from './recommendations.service';
import { StateService } from '../state/state.service';

@ApiTags('Recommendations')
@Controller('api/v1/state/user/:userId/recommendations')
export class RecommendationsController {
  constructor(
    private readonly recommendationsService: RecommendationsService,
    private readonly stateService: StateService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get personalized recommendations based on current state' })
  async getRecommendations(@Param('userId') userId: string) {
    const currentState = await this.stateService.getCurrentState(userId);
    return await this.recommendationsService.generateRecommendations(currentState);
  }
}
