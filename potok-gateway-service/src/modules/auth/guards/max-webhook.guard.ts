import {
    Injectable,
    CanActivate,
    ExecutionContext,
    UnauthorizedException,
    Logger,
  } from '@nestjs/common';
  import { AuthService } from '../auth.service';
  
  @Injectable()
  export class MaxWebhookGuard implements CanActivate {
    private readonly logger = new Logger(MaxWebhookGuard.name);
  
    constructor(private readonly authService: AuthService) {}
  
    canActivate(context: ExecutionContext): boolean {
      const request = context.switchToHttp().getRequest();
      const signature = request.headers['x-max-signature'];
      const body = request.body;
  
      if (!signature) {
        this.logger.warn('Отсутствует x-max-signature header');
        throw new UnauthorizedException('Missing webhook signature');
      }
  
      const isValid = this.authService.validateMaxWebhook(signature, body);
  
      if (!isValid) {
        throw new UnauthorizedException('Invalid webhook signature');
      }
  
      return true;
    }
  }
  