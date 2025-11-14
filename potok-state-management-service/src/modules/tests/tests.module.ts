import { Module } from '@nestjs/common';
import { TestsController } from './tests.controller';
import { TestsService } from './tests.service';
import { TestCalculatorService } from './services/test-calculator.service';
import { AdminClientModule } from '../admin-client/admin-client.module';
import { StateModule } from '../state/state.module';
import { RecommendationsService } from '@modules/recommendations/recommendations.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [AdminClientModule, StateModule, HttpModule],
  controllers: [TestsController],
  providers: [TestsService, TestCalculatorService, RecommendationsService],
  exports: [TestsService, TestCalculatorService],
})
export class TestsModule {}
