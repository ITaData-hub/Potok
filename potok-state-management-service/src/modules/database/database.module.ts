import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { ExternalDatabaseService } from './external-database.service';

@Module({
  imports: [ConfigModule, HttpModule],
  providers: [ExternalDatabaseService],
  exports: [ExternalDatabaseService],
})
export class DatabaseModule {}
