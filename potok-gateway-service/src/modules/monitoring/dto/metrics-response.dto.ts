import { ApiProperty } from '@nestjs/swagger';

export class MemoryUsageDto {
  @ApiProperty({ example: 50 })
  heapUsed: number;

  @ApiProperty({ example: 100 })
  heapTotal: number;

  @ApiProperty({ example: 10 })
  external: number;

  @ApiProperty({ example: 150 })
  rss: number;
}

export class CpuUsageDto {
  @ApiProperty({ example: 1000 })
  user: number;

  @ApiProperty({ example: 500 })
  system: number;
}

export class SystemMetricsDto {
  @ApiProperty({ example: 3600 })
  uptime: number;

  @ApiProperty({ type: MemoryUsageDto })
  memoryUsage: MemoryUsageDto;

  @ApiProperty({ type: CpuUsageDto })
  cpuUsage: CpuUsageDto;
}

export class ApplicationMetricsDto {
  @ApiProperty({ example: 1000 })
  totalRequests: number;

  @ApiProperty({ example: 5 })
  activeRequests: number;

  @ApiProperty({ example: 10 })
  failedRequests: number;

  @ApiProperty({ example: 45 })
  averageResponseTime: number;

  @ApiProperty({ example: 2.5 })
  requestsPerSecond: number;
}

export class TaskMetricsDto {
  @ApiProperty({ example: 100 })
  totalTasks: number;

  @ApiProperty({ example: 10 })
  activeTasks: number;

  @ApiProperty({ example: 80 })
  completedTasks: number;

  @ApiProperty({ example: 5 })
  failedTasks: number;

  @ApiProperty({ example: 5 })
  canceledTasks: number;
}

export class CacheMetricsDto {
  @ApiProperty({ example: 1000 })
  hits: number;

  @ApiProperty({ example: 100 })
  misses: number;

  @ApiProperty({ example: 50 })
  keys: number;

  @ApiProperty({ example: 90.91 })
  hitRate: number;
}

export class AllMetricsDto {
  @ApiProperty({ example: '2025-11-04T16:22:00.000Z' })
  timestamp: string;

  @ApiProperty({ type: SystemMetricsDto })
  system: SystemMetricsDto;

  @ApiProperty({ type: ApplicationMetricsDto })
  application: ApplicationMetricsDto;

  @ApiProperty({ type: TaskMetricsDto })
  tasks: TaskMetricsDto;

  @ApiProperty({ type: CacheMetricsDto })
  cache: CacheMetricsDto;
}