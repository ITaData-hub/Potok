// src/modules/bot/services/user-manager.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { AdminClientService } from '../../admin-client/admin-client.service';

@Injectable()
export class UserManager {
  private readonly logger = new Logger(UserManager.name);

  constructor(private readonly adminClient: AdminClientService) {}

  async ensureUserExists(maxUserId: string, maxUser: any): Promise<any> {
    try {
      let user = await this.getUserByMaxId(maxUserId);

      if (!user) {
        this.logger.log(`Creating new user with MAX ID: ${maxUserId}`);
        
        // Формируем данные для создания - ВАЖНО: все поля должны быть здесь
        const userData = {
          max_user_id: maxUserId, // ← Самое главное поле!
          username: maxUser.username || maxUser.first_name || maxUser.name || maxUserId,
          timezone: 'Europe/Moscow',
          onboarding_completed: false,
        };
        
        this.logger.debug('📤 User data to create:', JSON.stringify(userData, null, 2));
        
        // Создаем нового пользователя
        user = await this.adminClient.dbCreate('users', userData);

        this.logger.log(`✅ Created new user: ${user.id} (MAX ID: ${maxUserId})`);
      } else {
        this.logger.debug(`User already exists: ${user.id} (MAX ID: ${maxUserId})`);
      }

      return user;
    } catch (error) {
      this.logger.error(`❌ Error ensuring user exists: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getUserByMaxId(maxUserId: string): Promise<any> {
    try {
      const users = await this.adminClient.dbList('users', {
        max_user_id: maxUserId,
      }, 1, 0);
      
      return users && users.length > 0 ? users[0] : null;
    } catch (error) {
      this.logger.error(`Error getting user by MAX ID: ${error.message}`, error.stack);
      return null;
    }
  }

  async getUserSettings(userId: string): Promise<any> {
    try {
      const settings = await this.adminClient.dbList('user-settings', { user_id: userId }, 1, 0);
      return settings && settings.length > 0 ? settings[0] : this.getDefaultSettings();
    } catch (error) {
      this.logger.error(`Error fetching user settings: ${error.message}`);
      return this.getDefaultSettings();
    }
  }

  async updateUserSettings(userId: string, updates: any): Promise<void> {
    try {
      const settings = await this.getUserSettings(userId);
      
      if (settings.id) {
        await this.adminClient.dbUpdate('user-settings', settings.id, updates);
      } else {
        await this.adminClient.dbCreate('user-settings', {
          user_id: userId,
          ...updates,
        });
      }
    } catch (error) {
      this.logger.error(`Error updating user settings: ${error.message}`);
      throw error;
    }
  }

  async getUserState(maxUserId: string): Promise<string | null> {
    try {
      return await this.adminClient.redisGet(`user:${maxUserId}:state`);
    } catch (error) {
      this.logger.error(`Error getting user state: ${error.message}`);
      return null;
    }
  }

  async setUserState(maxUserId: string, state: string, ttl: number = 3600): Promise<void> {
    try {
      await this.adminClient.redisSet(`user:${maxUserId}:state`, state, ttl);
    } catch (error) {
      this.logger.error(`Error setting user state: ${error.message}`);
      throw error;
    }
  }

  async clearUserState(maxUserId: string): Promise<void> {
    try {
      await this.adminClient.redisDel(`user:${maxUserId}:state`);
    } catch (error) {
      this.logger.error(`Error clearing user state: ${error.message}`);
    }
  }

  async completeOnboarding(userId: string): Promise<void> {
    try {
      await this.adminClient.dbUpdate('users', userId, {
        onboarding_completed: true,
        onboarded_at: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(`Error completing onboarding: ${error.message}`);
      throw error;
    }
  }

  private getDefaultSettings(): any {
    return {
      notifications_enabled: true,
      test_reminders: true,
      work_start_time: '09:00',
      work_end_time: '18:00',
    };
  }
}
