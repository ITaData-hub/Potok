import { Injectable } from '@nestjs/common';
import { WebsocketGateway } from './websocket.gateway';

@Injectable()
export class WebsocketService {
  constructor(private readonly gateway: WebsocketGateway) {}

  notifyStateUpdate(userId: string, state: any): void {
    this.gateway.notifyStateUpdate(userId, state);
  }

  notifyTaskProgress(userId: string, task: any): void {
    this.gateway.notifyTaskProgress(userId, task);
  }

  notifyMitRecommended(userId: string, mit: any): void {
    this.gateway.notifyMitRecommended(userId, mit);
  }

  notifyBreakRecommendation(userId: string, reason: string): void {
    this.gateway.notifyBreakRecommendation(userId, reason);
  }

  isUserOnline(userId: string): boolean {
    return this.gateway.isUserOnline(userId);
  }
}
