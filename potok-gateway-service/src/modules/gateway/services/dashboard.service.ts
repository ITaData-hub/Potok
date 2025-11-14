import { Injectable, Logger } from '@nestjs/common';
import { ServiceIntegration } from '../../bot/services/service-integration.service';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(private readonly serviceIntegration: ServiceIntegration) {}

  async getDashboardData(): Promise<any> {
    return { message: 'Use /dashboard/user/:id for specific user data' };
  }

  async getUserDashboard(userId: string): Promise<any> {
    this.logger.debug(`Fetching dashboard for user ${userId}`);

    try {
      const [state, tasks, mit, stats, recommendations] = await Promise.all([
        this.serviceIntegration.getCurrentState(userId),
        this.serviceIntegration.getUserTasks(userId),
        this.serviceIntegration.calculateMIT(userId),
        this.serviceIntegration.getUserStats(userId, 'week'),
        this.serviceIntegration.getRecommendations(userId),
      ]);

      const activeTasks = tasks.filter(t => 
        (t.task?.status === 'pending' || t.task?.status === 'in_progress')
      );

      const completedToday = tasks.filter(t => {
        if (t.task?.status !== 'completed' || !t.task?.completed_at) return false;
        const completedDate = new Date(t.task.completed_at);
        const today = new Date();
        return completedDate.toDateString() === today.toDateString();
      }).length;

      return {
        userId,
        timestamp: new Date().toISOString(),
        
        state: {
          energy: state.energy,
          energy_adjusted: state.energy_adjusted,
          focus: state.focus,
          focus_adjusted: state.focus_adjusted,
          motivation: state.motivation,
          stress: state.stress,
          ui_mode: state.ui_mode,
          ui_mode_description: state.ui_mode_description,
          is_peak_time: state.is_peak_time,
          circadian: state.circadian,
        },

        tasks: {
          total: tasks.length,
          active: activeTasks.length,
          completed_today: completedToday,
          mit: mit ? {
            id: mit.taskId,
            title: mit.title,
            recommended_time: mit.recommended_time,
            priority_score: mit.priority_score,
          } : null,
        },

        statistics: {
          week: {
            tasks_completed: stats.tasks_completed,
            completion_rate: stats.completion_rate,
            average_energy: stats.average_energy,
            average_focus: stats.average_focus,
            total_work_time: stats.total_work_time,
            peak_hours: stats.peak_hours,
          },
        },

        recommendations: {
          work_mode: recommendations.work_mode,
          break_needed: recommendations.break_needed,
          break_duration: recommendations.break_duration,
          suggestions: recommendations.recommendations.slice(0, 5),
        },
      };
    } catch (error) {
      this.logger.error(`Error fetching dashboard data: ${error.message}`);
      throw error;
    }
  }
}
