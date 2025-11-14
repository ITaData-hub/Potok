import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { DashboardService } from '../services/dashboard.service';

@ApiTags('Gateway - Dashboard')
@Controller('api/v1/gateway/dashboard')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @ApiOperation({ summary: 'Get dashboard data for authenticated user' })
  async getDashboard() {
    return await this.dashboardService.getDashboardData();
  }

  @Get('user/:id')
  @ApiOperation({ summary: 'Get dashboard for specific user' })
  async getUserDashboard(@Param('id') userId: string) {
    return await this.dashboardService.getUserDashboard(userId);
  }
}
