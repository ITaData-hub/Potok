// src/modules/websocket/task-websocket.gateway.ts
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
import { Logger, UsePipes, ValidationPipe } from '@nestjs/common';
import { SubscribeTaskDto, UnsubscribeTaskDto } from './dto/subscribe-task.dto';
import { GatewayService } from '../gateway/gateway.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/ws',
})
export class TaskWebsocketGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private logger = new Logger('TaskWebsocketGateway');
  private taskSubscriptions: Map<string, Set<string>> = new Map();

  constructor(private readonly gatewayService: GatewayService) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    // Очистка подписок клиента
    this.taskSubscriptions.forEach((clients, taskId) => {
      clients.delete(client.id);
      if (clients.size === 0) {
        this.taskSubscriptions.delete(taskId);
      }
    });
  }

  @UsePipes(new ValidationPipe({ transform: true }))
  @SubscribeMessage('subscribe_task')
  async handleSubscribeTask(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SubscribeTaskDto,
  ) {
    const { taskId } = data;
    
    try {
      // Получаем задачу через проксирование к Admin Service
      const task = await this.gatewayService.proxyToService(
        'admin',
        `/api/v1/tasks/${taskId}`,
        'GET',
      );
      
      // Добавляем клиента в подписчиков задачи
      if (!this.taskSubscriptions.has(taskId)) {
        this.taskSubscriptions.set(taskId, new Set());
      }
      this.taskSubscriptions.get(taskId)!.add(client.id);
      
      // Отправляем текущий статус
      client.emit(`task_progress_${taskId}`, {
        id: task.id,
        status: task.status,
        percent: task.percent,
        message: task.message,
        errors: task.errors,
        timestamp: new Date(),
      });
      
      this.logger.log(`Client ${client.id} subscribed to task ${taskId}`);
      return { success: true, message: 'Subscribed to task updates' };
    } catch (error) {
      this.logger.error(`Error subscribing to task: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  @UsePipes(new ValidationPipe({ transform: true }))
  @SubscribeMessage('unsubscribe_task')
  handleUnsubscribeTask(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: UnsubscribeTaskDto,
  ) {
    const { taskId } = data;
    
    const subscribers = this.taskSubscriptions.get(taskId);
    if (subscribers) {
      subscribers.delete(client.id);
      if (subscribers.size === 0) {
        this.taskSubscriptions.delete(taskId);
      }
    }
    
    this.logger.log(`Client ${client.id} unsubscribed from task ${taskId}`);
    return { success: true, message: 'Unsubscribed from task updates' };
  }

  // Метод для отправки обновлений задачи всем подписчикам
  async emitTaskUpdate(taskId: string) {
    const subscribers = this.taskSubscriptions.get(taskId);
    if (!subscribers || subscribers.size === 0) {
      return;
    }

    try {
      // Получаем задачу через проксирование к Admin Service
      const task = await this.gatewayService.proxyToService(
        'admin',
        `/api/v1/tasks/${taskId}`,
        'GET',
      );
      
      const updateData = {
        id: task.id,
        status: task.status,
        percent: task.percent,
        message: task.message,
        errors: task.errors,
        timestamp: new Date(),
      };

      subscribers.forEach((clientId) => {
        this.server.to(clientId).emit(`task_progress_${taskId}`, updateData);
      });

      this.logger.log(`Task update emitted for ${taskId} to ${subscribers.size} clients`);
    } catch (error) {
      this.logger.error(`Error emitting task update: ${error.message}`);
    }
  }

  // Метод для отправки завершения задачи
  async emitTaskCompleted(taskId: string) {
    await this.emitTaskUpdate(taskId);
    
    const subscribers = this.taskSubscriptions.get(taskId);
    if (subscribers) {
      subscribers.forEach((clientId) => {
        this.server.to(clientId).emit(`task_completed_${taskId}`, {
          taskId,
          timestamp: new Date(),
        });
      });
    }
  }
}
