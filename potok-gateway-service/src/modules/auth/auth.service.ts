import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

interface JwtPayload {
  sub: string;
  maxUserId: string;
  iat: number;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Генерация JWT токена для пользователя
   */
  generateToken(userId: string, maxUserId: string): string {
    const payload: JwtPayload = {
      sub: userId,
      maxUserId,
      iat: Math.floor(Date.now() / 1000),
    };

    return this.jwtService.sign(payload);
  }

  /**
   * Генерация refresh токена
   */
  generateRefreshToken(userId: string, maxUserId: string): string {
    const payload: JwtPayload = {
      sub: userId,
      maxUserId,
      iat: Math.floor(Date.now() / 1000),
    };

    const refreshSecret = this.configService.get<string>('jwt.refreshSecret') || 'refresh-secret';
    const refreshExpiresIn = this.configService.get<string>('jwt.refreshExpiresIn') || '7d';

    return this.jwtService.sign(payload, {
      secret: refreshSecret,
      expiresIn: refreshExpiresIn as any, // Type assertion
    });
  }

  /**
   * Валидация JWT токена
   */
  async validateToken(token: string): Promise<any> {
    try {
      const decoded = this.jwtService.verify(token);
      return decoded;
    } catch (error) {
      this.logger.error(`Ошибка валидации токена: ${error.message}`);
      return null;
    }
  }

  /**
   * Валидация MAX webhook signature
   */
  validateMaxWebhook(signature: string, body: any): boolean {
    const webhookSecret = this.configService.get<string>(
      'services.maxBot.webhookSecret',
    );

    if (!webhookSecret) {
      this.logger.warn('MAX webhook secret не настроен');
      return false;
    }

    const bodyString = JSON.stringify(body);
    const hmac = crypto
      .createHmac('sha256', webhookSecret)
      .update(bodyString)
      .digest('hex');

    const isValid = hmac === signature;

    if (!isValid) {
      this.logger.warn('MAX webhook signature невалидна');
    }

    return isValid;
  }

  /**
   * Извлечение токена из заголовка Authorization
   */
  extractTokenFromHeader(authHeader: string): string | null {
    if (!authHeader) return null;

    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' ? token : null;
  }
}
