import {
    Injectable,
    CanActivate,
    ExecutionContext,
    UnauthorizedException,
  } from '@nestjs/common';
  import { ConfigService } from '@nestjs/config';
  import { API_KEY_HEADER } from '../constants';
  
  @Injectable()
  export class ApiKeyGuard implements CanActivate {
    constructor(private readonly configService: ConfigService) {}
  
    canActivate(context: ExecutionContext): boolean {
      const request = context.switchToHttp().getRequest();
      const apiKey = request.headers[API_KEY_HEADER];
      const validApiKey = this.configService.get<string>('API_KEY');
  
      if (!apiKey || apiKey !== validApiKey) {
        throw new UnauthorizedException('Invalid API key');
      }
  
      return true;
    }
  }
  