import { Controller, Get, Post, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { DistributionService } from './distribution.service';

@ApiTags('Task Distribution')
@Controller('api/v1/distribution')
export class DistributionController {
  constructor(private readonly distributionService: DistributionService) {}

  @Get('user/:userId/tasks')
  @ApiOperation({ summary: 'Get sorted tasks for user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  async getUserTasks(@Param('userId') userId: string) {
    return await this.distributionService.getUserTasksSorted(userId);
  }

  @Post('user/:userId/prioritize')
  @ApiOperation({ summary: 'Prioritize user tasks' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  async prioritizeTasks(@Param('userId') userId: string) {
    return await this.distributionService.prioritizeUserTasks(userId);
  }

  @Post('user/:userId/mit')
  @ApiOperation({ summary: 'Calculate MIT for user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  async calculateMIT(@Param('userId') userId: string) {
    return await this.distributionService.calculateUserMIT(userId);
  }

  @Post('user/:userId/reschedule')
  @ApiOperation({ summary: 'Reschedule tasks with low state match' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  async rescheduleTasks(
    @Param('userId') userId: string,
    @Param() body: { taskIds?: string[]; reason?: string },
  ) {
    return await this.distributionService.rescheduleTasks(
      userId,
      body?.taskIds,
      body?.reason,
    );
  }

  @Get('user/:userId/history')
  @ApiOperation({ summary: 'Get distribution history' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  async getHistory(@Param('userId') userId: string) {
    return await this.distributionService.getDistributionHistory(userId);
  }
}
