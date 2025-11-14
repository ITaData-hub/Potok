import { Controller, Post, Body, Logger, HttpCode } from '@nestjs/common';
import { BotService } from '../bot/bot.service';
import { UserManager } from '../bot/services/user-manager.service';

@Controller('api/v1/notifications')
export class NotificationsController {
  private readonly logger = new Logger(NotificationsController.name);

  constructor(
    private readonly botService: BotService,
    private readonly userManager: UserManager,
  ) {}

  @Post('test-reminder')
  @HttpCode(200)
  async sendTestReminder(@Body() dto: { userId: string; testType: string; scheduledTime: string }) {
    try {
      const user = await this.userManager.getUserByMaxId(dto.userId);
      
      if (!user || !user.max_user_id) {
        this.logger.warn(`User ${dto.userId} not found`);
        return { success: false, message: 'User not found' };
      }

      await this.botService.sendTestReminder(user.max_user_id, dto.testType as any);
      
      return { success: true, message: 'Reminder sent' };
    } catch (error) {
      this.logger.error(`Error: ${error.message}`);
      return { success: false, message: error.message };
    }
  }
}
