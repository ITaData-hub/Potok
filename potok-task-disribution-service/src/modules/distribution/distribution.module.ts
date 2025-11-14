import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { DistributionController } from './distribution.controller';
import { DistributionService } from './distribution.service';
import { StateMatchAlgorithm } from './logic/state-match-algorithm';
import { MitCalculatorService } from './services/mit-calculator.service';
import { PriorityCalculatorService } from './services/priority-calculator.service';
import { AdminClientModule } from '../admin-client/admin-client.module';
import { StateClientModule } from '../state-client/state-client.module';

@Module({
  imports: [
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 3,
    }),
    AdminClientModule,
    StateClientModule,
  ],
  controllers: [DistributionController],
  providers: [
    DistributionService,
    StateMatchAlgorithm,
    MitCalculatorService,
    PriorityCalculatorService,
  ],
  exports: [DistributionService],
})
export class DistributionModule {}
