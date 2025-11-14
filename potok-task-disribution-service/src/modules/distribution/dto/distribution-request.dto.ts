import { IsString, IsNumber, Min, Max, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TaskStageDto {
  @ApiProperty()
  @IsString()
  stageId: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  duration: number;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  dependsOn: string[];

  @ApiProperty()
  @IsOptional()
  isSequential?: boolean;
}

export class TaskDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsString()
  userId: string;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ minimum: 1, maximum: 5 })
  @IsNumber()
  @Min(1)
  @Max(5)
  priority: number;

  @ApiProperty()
  @IsString()
  deadline: string;

  @ApiProperty({ description: 'Оцениваемая длительность в минутах' })
  @IsNumber()
  @Min(1)
  estimatedDuration: number;

  @ApiProperty()
  @IsString()
  category: string;

  @ApiProperty({ minimum: 1, maximum: 10 })
  @IsNumber()
  @Min(1)
  @Max(10)
  complexity: number;

  @ApiProperty({ minimum: 1, maximum: 10 })
  @IsNumber()
  @Min(1)
  @Max(10)
  requiredEnergy: number;

  @ApiProperty({ minimum: 1, maximum: 10 })
  @IsNumber()
  @Min(1)
  @Max(10)
  requiredFocus: number;

  @ApiProperty()
  @IsString()
  status: string;

  @ApiPropertyOptional({ type: [TaskStageDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskStageDto)
  stages?: TaskStageDto[];
}

export class DistributionRequestDto {
  @ApiProperty()
  @IsString()
  userId: string;

  @ApiProperty({ minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  energy: number;

  @ApiProperty({ minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  focus: number;

  @ApiProperty({ minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  motivation: number;

  @ApiProperty({ minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  stress: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  circadianFactor?: number;

  @ApiPropertyOptional({ type: [TaskDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskDto)
  tasks?: TaskDto[];
}
