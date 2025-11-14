import {
    IsEnum,
    IsArray,
    ArrayMinSize,
    ArrayMaxSize,
    IsInt,
    Min,
    Max,
    IsDateString,
    IsOptional,
    IsString,
  } from 'class-validator';
  import { TestType } from '../../../common/enums/test-type.enum';
  import { ApiProperty } from '@nestjs/swagger';
  
  export class SubmitTestDto {
    @ApiProperty({
      enum: TestType,
      description: 'Type of test',
      example: TestType.ENERGY,
    })
    @IsEnum(TestType)
    test_type: TestType;
  
    @ApiProperty({
      type: [Number],
      description: 'Array of 3 answers (1-3)',
      example: [3, 2, 3],
    })
    @IsArray()
    @ArrayMinSize(3)
    @ArrayMaxSize(3)
    @IsInt({ each: true })
    @Min(1, { each: true })
    @Max(3, { each: true })
    answers: number[];
  
    @ApiProperty({
      description: 'Timestamp of test submission',
      example: '2025-11-07T08:30:00Z',
    })
    @IsDateString()
    timestamp: string;
  
    @ApiProperty({
      description: 'User timezone',
      example: 'Europe/Moscow',
      required: false,
    })
    @IsOptional()
    @IsString()
    timezone?: string;
  }
  