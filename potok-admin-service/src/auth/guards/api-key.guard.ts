import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name);
  private readonly validApiKeys: string[];

  constructor(private readonly configService: ConfigService) {
    // ИСПРАВЛЕНО: Читаем API_KEYS вместо ADMIN_API_KEY
    const keysString = this.configService.get<string>('API_KEYS') || '';
    this.validApiKeys = keysString
      .split(',')
      .map(k => k.trim())
      .filter(k => k.length > 0);
    
    if (this.validApiKeys.length === 0) {
      this.logger.warn('⚠️  No API keys configured. API endpoints will be unprotected!');
      this.logger.warn('Set API_KEYS in .env (comma-separated)');
    } else {
      this.logger.log(`✅ API Key guard initialized with ${this.validApiKeys.length} key(s)`);
    }
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const apiKey = request.headers['x-api-key'] as string;

    // Если API ключи не сконфигурированы - разрешаем доступ (только для dev)
    if (this.validApiKeys.length === 0) {
      this.logger.warn('⚠️  API Key validation skipped - no keys configured');
      return true;
    }

    // Проверяем API ключ
    if (!apiKey) {
      throw new UnauthorizedException('Missing API Key. Provide X-API-Key header.');
    }

    if (!this.validApiKeys.includes(apiKey)) {
      throw new UnauthorizedException('Invalid API Key');
    }

    this.logger.debug('✅ API Key validated successfully');
    return true;
  }
}
