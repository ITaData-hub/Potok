import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GatewayController } from './gateway.controller';
import { GatewayService } from './gateway.service';
import { MicroserviceProxyService } from './microservice-proxy.service';
import { RequestAggregatorService } from './request-aggregator.service';
import { DashboardController } from './controllers/dashboard.controller';
import { TaskProxyController } from './controllers/task-proxy.controller';
import { StateProxyController } from './controllers/state-proxy.controller';
import { AnalyticsProxyController } from './controllers/analytics-proxy.controller';
import { DashboardService } from './services/dashboard.service';
import { HttpModule} from '@nestjs/axios';
import { ServiceIntegration } from '../bot/services/service-integration.service';
import { CircuitBreakerService } from './circuit-breaker.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { JwtService } from '@nestjs/jwt';

@Module({
  imports: [ConfigModule, HttpModule],
  controllers: [
    GatewayController,
    DashboardController,
    TaskProxyController,
    StateProxyController,
    AnalyticsProxyController,
  ],
  providers: [
    GatewayService,
    MicroserviceProxyService,
    RequestAggregatorService,
    DashboardService,
    ServiceIntegration,
    CircuitBreakerService,
    WebsocketGateway,
    JwtService
  ],
  exports: [GatewayService],
})
export class GatewayModule {}
