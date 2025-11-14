import { Module, Global } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AdminClientService } from './admin-client.service';

@Global()
@Module({
  imports: [
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 3,
    }),
  ],
  providers: [AdminClientService],
  exports: [AdminClientService],
})
export class AdminClientModule {}
