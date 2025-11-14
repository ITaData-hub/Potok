import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly serviceName: string;
  private readonly adminServiceUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.serviceName = this.configService.get<string>('APP_NAME') || "";
    this.adminServiceUrl = this.configService.get<string>('ADMIN_SERVICE_URL') || "";
  }

  async check() {
    const adminService = await this.checkAdminService();

    const status = adminService ? 'healthy' : 'degraded';

    return {
      status,
      service: this.serviceName,
      timestamp: new Date().toISOString(),
      dependencies: {
        admin_service: adminService ? 'up' : 'down',
      },
    };
  }

  async ready() {
    const adminService = await this.checkAdminService();

    if (adminService) {
      return { status: 'ready' };
    }

    throw new Error('Service not ready - admin service unavailable');
  }

  private async checkAdminService(): Promise<boolean> {
    try {
      await firstValueFrom(
        this.httpService.get(`${this.adminServiceUrl}/api/v1/health`, {
          timeout: 3000,
        }),
      );
      return true;
    } catch (error) {
      this.logger.error(`Admin service check failed: ${error.message}`);
      return false;
    }
  }
}
