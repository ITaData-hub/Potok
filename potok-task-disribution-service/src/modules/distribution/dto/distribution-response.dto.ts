import { ApiProperty } from '@nestjs/swagger';

export class ScheduledDateDto {
  @ApiProperty()
  date: string;

  @ApiProperty()
  startTime: string;

  @ApiProperty()
  duration: number;

  @ApiProperty({ required: false })
  stageIds?: string[];
}

export class ScheduledTaskDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  priority: number;

  @ApiProperty()
  deadline: string;

  @ApiProperty()
  estimatedDuration: number;

  @ApiProperty()
  category: string;

  @ApiProperty()
  status: string;

  @ApiProperty({ type: [ScheduledDateDto] })
  scheduledDates: ScheduledDateDto[];
}

export class RecommendationDto {
  @ApiProperty()
  type: string;

  @ApiProperty()
  message: string;

  @ApiProperty()
  priority: string;

  @ApiProperty({ required: false })
  task?: any;

  @ApiProperty({ required: false })
  data?: any;
}

export class WarningDto {
  @ApiProperty()
  level: string;

  @ApiProperty({ required: false })
  taskId?: string;

  @ApiProperty({ required: false })
  taskTitle?: string;

  @ApiProperty()
  reason: string;

  @ApiProperty({ required: false })
  deadline?: string;

  @ApiProperty({ required: false })
  earliestPossibleCompletion?: string;

  @ApiProperty({ required: false })
  alternatives?: string[];
}

export class WorkloadAnalysisDto {
  @ApiProperty()
  date: string;

  @ApiProperty()
  usedMinutes: number;

  @ApiProperty()
  availableMinutes: number;

  @ApiProperty()
  workloadPercentage: number;

  @ApiProperty()
  isOverloaded: boolean;

  @ApiProperty()
  level: string;
}

export class FeasibilityReportDto {
  @ApiProperty()
  totalTasks: number;

  @ApiProperty()
  scheduledCount: number;

  @ApiProperty()
  unfeasibleCount: number;

  @ApiProperty({ type: [WarningDto] })
  warnings: WarningDto[];

  @ApiProperty({ type: [WorkloadAnalysisDto] })
  workloadAnalysis: WorkloadAnalysisDto[];
}

export class MetadataDto {
  @ApiProperty()
  calculatedAt: string;

  @ApiProperty()
  totalProcessingTime: number;

  @ApiProperty()
  correlationId: string;
}

export class DistributionResponseDto {
  @ApiProperty()
  userId: string;

  @ApiProperty({ type: [ScheduledTaskDto] })
  scheduledTasks: ScheduledTaskDto[];

  @ApiProperty({ type: [ScheduledTaskDto] })
  unfeasibleTasks: ScheduledTaskDto[];

  @ApiProperty({ required: false })
  mit?: ScheduledTaskDto;

  @ApiProperty({ type: [RecommendationDto] })
  recommendations: RecommendationDto[];

  @ApiProperty()
  feasibilityReport: FeasibilityReportDto;

  @ApiProperty()
  metadata: MetadataDto;
}
