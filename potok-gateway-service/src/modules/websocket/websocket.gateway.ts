import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { WsJwtGuard } from './guards/ws-jwt.guard';

@WebSocketGateway({
  cors: { origin: '*' },
  path: '/api/v1/socket.io',
  transports: ['websocket', 'polling'],
})
export class WebsocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WebsocketGateway.name);
  private readonly userSockets = new Map<string, Set<string>>();

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);

    // Удаляем из маппинга
    for (const [userId, sockets] of this.userSockets.entries()) {
      sockets.delete(client.id);
      if (sockets.size === 0) {
        this.userSockets.delete(userId);
      }
    }
  }

  @SubscribeMessage('authenticate')
  @UseGuards(WsJwtGuard)
  async handleAuthenticate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string },
  ) {
    const { userId } = data;

    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(client.id);
    this.logger.log(`User ${userId} authenticated on socket ${client.id}`);

    client.emit('authenticated', { userId, timestamp: new Date().toISOString() });
  }

  // ==================== Broadcast Events ====================

  notifyStateUpdate(userId: string, state: any): void {
    const sockets = this.userSockets.get(userId);
    if (!sockets || sockets.size === 0) return;

    sockets.forEach((socketId) => {
      this.server.to(socketId).emit('state_updated', {
        userId,
        state,
        timestamp: new Date().toISOString(),
      });
    });

    this.logger.debug(`State update sent to user ${userId}`);
  }

  notifyTaskProgress(userId: string, task: any): void {
    const sockets = this.userSockets.get(userId);
    if (!sockets || sockets.size === 0) return;

    sockets.forEach((socketId) => {
      this.server.to(socketId).emit('task_progress', {
        userId,
        task,
        timestamp: new Date().toISOString(),
      });
    });

    this.logger.debug(`Task progress sent to user ${userId}`);
  }

  notifyMitRecommended(userId: string, mit: any): void {
    const sockets = this.userSockets.get(userId);
    if (!sockets || sockets.size === 0) return;

    sockets.forEach((socketId) => {
      this.server.to(socketId).emit('mit_recommended', {
        userId,
        mit,
        timestamp: new Date().toISOString(),
      });
    });

    this.logger.debug(`MIT recommendation sent to user ${userId}`);
  }

  notifyBreakRecommendation(userId: string, reason: string): void {
    const sockets = this.userSockets.get(userId);
    if (!sockets || sockets.size === 0) return;

    sockets.forEach((socketId) => {
      this.server.to(socketId).emit('break_recommended', {
        userId,
        reason,
        timestamp: new Date().toISOString(),
      });
    });

    this.logger.debug(`Break recommendation sent to user ${userId}`);
  }

  isUserOnline(userId: string): boolean {
    const sockets = this.userSockets.get(userId);
    const flag = sockets && sockets.size > 0;
    if (flag) {
      return flag
    } else {
      return false
    }
  }

  /**
* Универсальный метод для отправки событий пользователю
*/
  sendToUser(userId: string, event: string, data: any): void {
    const sockets = this.userSockets.get(userId);

    if (!sockets || sockets.size === 0) {
      this.logger.debug(`User ${userId} is not connected, skipping event ${event}`);
      return;
    }

    sockets.forEach((socketId) => {
      this.server.to(socketId).emit(event, {
        userId,
        timestamp: new Date().toISOString(),
        ...data,
      });
    });

    this.logger.debug(`Event '${event}' sent to user ${userId}`);
  }

  /**
   * Уведомление о старте задачи
   */
  notifyTaskStarted(userId: string, taskData: any): void {
    this.sendToUser(userId, 'task_started', taskData);
  }

  /**
   * Уведомление о завершении задачи
   */
  notifyTaskCompleted(userId: string, taskData: any): void {
    this.sendToUser(userId, 'task_completed', taskData);
  }

  /**
   * Уведомление об отмене задачи
   */
  notifyTaskCancelled(userId: string, taskData: any): void {
    this.sendToUser(userId, 'task_cancelled', taskData);
  }

  /**
   * Broadcast события всем подключенным клиентам
   */
  broadcast(event: string, data: any): void {
    this.server.emit(event, {
      timestamp: new Date().toISOString(),
      ...data,
    });

    this.logger.debug(`Event '${event}' broadcasted to all clients`);
  }
}
