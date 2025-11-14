// src/common/middleware/api-key.middleware.ts
import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class ApiKeyMiddleware implements NestMiddleware {
  private readonly validApiKeys: string[];

  constructor(private configService: ConfigService) {
    const keys = this.configService.get<string>('API_KEYS') || '';
    this.validApiKeys = keys.split(',').map(k => k.trim()).filter(k => k.length > 0);
  }

  use(req: Request, res: Response, next: NextFunction) {
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey || !this.validApiKeys.includes(apiKey)) {
      throw new UnauthorizedException('Invalid or missing API key');
    }

    next();
  }
}
