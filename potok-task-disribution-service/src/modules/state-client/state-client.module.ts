import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { StateClientService } from './state-client.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 2,
    }),
  ],
  providers: [StateClientService],
  exports: [StateClientService],
})
export class StateClientModule {}
