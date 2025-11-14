import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from '@modules/health/health.module';
import { AdminClientModule } from '@modules/admin-client/admin-client.module';
import { StateClientModule } from '@modules/state-client/state-client.module';
import { DistributionModule } from '@modules/distribution/distribution.module';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    AdminClientModule,
    StateClientModule,
    DistributionModule,
    HealthModule,
  ],
})
export class AppModule {}
