// src/auth/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

export interface JwtPayload {
  sub: string;
  username: string;
  roles: string[];
  serviceId?: string;
}

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  roles: string[];
  apiKey?: string;
  serviceId?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // Валидация пользователя по username и password
  async validateUser(username: string, password: string): Promise<AuthUser | null> {
    // TODO: Здесь должна быть логика получения пользователя из БД
    // Для примера используем mock данные
    const mockUsers = this.getMockUsers();
    const user = mockUsers.find(u => u.username === username);

    if (user && await this.comparePasswords(password, user.passwordHash)) {
      const { passwordHash, ...result } = user;
      return result;
    }

    return null;
  }

  // Валидация пользователя по ID из JWT payload
  async validateUserById(userId: string): Promise<AuthUser | null> {
    const mockUsers = this.getMockUsers();
    const user = mockUsers.find(u => u.id === userId);

    if (user) {
      const { passwordHash, ...result } = user;
      return result;
    }

    return null;
  }

  // Валидация API ключа
  async validateApiKey(apiKey: string): Promise<AuthUser | null> {
    const validApiKeys = this.configService.get<string>('API_KEYS')?.split(',') || [];
    
    if (validApiKeys.includes(apiKey)) {
      // Возвращаем сервисного пользователя
      return {
        id: `service_${apiKey.substring(0, 8)}`,
        username: 'service',
        email: 'service@admin.local',
        roles: ['service', 'read', 'write'],
        serviceId: apiKey,
        apiKey,
      };
    }

    return null;
  }

  // Вход с генерацией JWT токена
  async login(user: AuthUser): Promise<{ access_token: string; refresh_token: string }> {
    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      roles: user.roles,
      serviceId: user.serviceId,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: this.configService.get('JWT_EXPIRES_IN') || '1h',
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN') || '7d',
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  // Регистрация нового пользователя
  async register(
    username: string,
    email: string,
    password: string,
    roles: string[] = ['user'],
  ): Promise<AuthUser> {
    // Хешируем пароль
    const passwordHash = await this.hashPassword(password);

    // TODO: Сохранить пользователя в БД
    const newUser: AuthUser = {
      id: this.generateId(),
      username,
      email,
      roles,
    };

    return newUser;
  }

  // Обновление токена
  async refreshToken(refreshToken: string): Promise<{ access_token: string }> {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken);
      
      const newPayload: JwtPayload = {
        sub: payload.sub,
        username: payload.username,
        roles: payload.roles,
        serviceId: payload.serviceId,
      };

      const accessToken = await this.jwtService.signAsync(newPayload, {
        expiresIn: this.configService.get('JWT_EXPIRES_IN') || '1h',
      });

      return { access_token: accessToken };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  // Верификация токена
  async verifyToken(token: string): Promise<JwtPayload> {
    try {
      return await this.jwtService.verifyAsync(token);
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  // Хеширование пароля
  async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
  }

  // Сравнение паролей
  async comparePasswords(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
  }

  // Генерация нового API ключа
  generateApiKey(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let apiKey = '';
    for (let i = 0; i < 32; i++) {
      apiKey += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return apiKey;
  }

  // Вспомогательные методы
  private generateId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Mock данные для примера
  private getMockUsers() {
    return [
      {
        id: 'user_1',
        username: 'admin',
        email: 'admin@example.com',
        passwordHash: '$2b$10$X8X8X8X8X8X8X8X8X8X8X8X8X8X8X8X8X8X8X8X8X8X8X8', // 'admin123'
        roles: ['admin', 'user', 'service'],
      },
      {
        id: 'user_2',
        username: 'developer',
        email: 'dev@example.com',
        passwordHash: '$2b$10$Y9Y9Y9Y9Y9Y9Y9Y9Y9Y9Y9Y9Y9Y9Y9Y9Y9Y9Y9Y9Y9Y9Y9', // 'dev123'
        roles: ['developer', 'user'],
      },
    ];
  }
}
