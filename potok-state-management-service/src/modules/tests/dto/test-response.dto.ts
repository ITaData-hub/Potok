import { ApiProperty } from '@nestjs/swagger';
import { UIMode } from '../../../common/enums/ui-mode.enum';
import { TestType } from '../../../common/enums/test-type.enum';

export class TestResponseDto {
  @ApiProperty()
  user_id: string;

  @ApiProperty({ enum: TestType })
  test_type: TestType;

  @ApiProperty({ description: 'Score 0-100' })
  score: number;

  @ApiProperty({ description: 'Raw score (varies by test type)' })
  raw_score: number;

  @ApiProperty()
  interpretation: string;

  @ApiProperty({ type: [String] })
  recommendations: string[];

  @ApiProperty({ enum: UIMode })
  ui_mode: UIMode;

  @ApiProperty()
  circadian_factor: number;

  @ApiProperty()
  timestamp: string;
}
