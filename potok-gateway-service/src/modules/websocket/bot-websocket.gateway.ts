import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnGatewayInit,
  } from '@nestjs/websockets';
  import { Logger } from '@nestjs/common';
  import { Server, Socket } from 'socket.io';
  
  @WebSocketGateway({
    cors: {
      origin: '*',
      credentials: true,
    },
    namespace: '/bot',
  })
  export class BotWebsocketGateway
    implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
  {
    @WebSocketServer()
    server: Server;
  
    private readonly logger = new Logger(BotWebsocketGateway.name);
  
    constructor() {}
  
    afterInit(server: Server) {
      this.logger.log('WebSocket Gateway инициализирован');
    }
  
    handleConnection(client: Socket) {
      this.logger.log(`Клиент подключен: ${client.id}`);
    }
  
    handleDisconnect(client: Socket) {
      this.logger.log(`Клиент отключен: ${client.id}`);
    }
  
    /**
     * Подписка на обновления пользователя
     */
    @SubscribeMessage('subscribe_user')
    async handleSubscribeUser(client: Socket, payload: { userId: string }) {
      const { userId } = payload;
      await client.join(`user:${userId}`);
      this.logger.log(`Клиент ${client.id} подписался на user:${userId}`);
      
      return { event: 'subscribed', data: { userId } };
    }
  
    /**
     * Отписка от обновлений пользователя
     */
    @SubscribeMessage('unsubscribe_user')
    async handleUnsubscribeUser(client: Socket, payload: { userId: string }) {
      const { userId } = payload;
      await client.leave(`user:${userId}`);
      this.logger.log(`Клиент ${client.id} отписался от user:${userId}`);
      
      return { event: 'unsubscribed', data: { userId } };
    }
  
    /**
     * Отправить обновление состояния пользователю
     */
    emitStateUpdate(userId: string, state: any) {
      this.server.to(`user:${userId}`).emit('state_update', {
        timestamp: new Date().toISOString(),
        state,
      });
      this.logger.debug(`State update отправлен user:${userId}`);
    }
  
    /**
     * Отправить уведомление о новой задаче
     */
    emitTaskNotification(userId: string, task: any) {
      this.server.to(`user:${userId}`).emit('task_notification', {
        timestamp: new Date().toISOString(),
        task,
      });
      this.logger.debug(`Task notification отправлен user:${userId}`);
    }
  
    /**
     * Отправить напоминание о тесте
     */
    emitTestReminder(userId: string, testType: string) {
      this.server.to(`user:${userId}`).emit('test_reminder', {
        timestamp: new Date().toISOString(),
        testType,
      });
      this.logger.debug(`Test reminder отправлен user:${userId}: ${testType}`);
    }
  
    /**
     * Отправить обновление MIT
     */
    emitMITUpdate(userId: string, mit: any) {
      this.server.to(`user:${userId}`).emit('mit_update', {
        timestamp: new Date().toISOString(),
        mit,
      });
      this.logger.debug(`MIT update отправлен user:${userId}`);
    }
  
    /**
     * Broadcast сообщение всем подключенным клиентам
     */
    broadcastMessage(event: string, data: any) {
      this.server.emit(event, {
        timestamp: new Date().toISOString(),
        data,
      });
      this.logger.debug(`Broadcast ${event} отправлен всем клиентам`);
    }
  }
  