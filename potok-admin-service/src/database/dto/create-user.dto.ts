import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty()
  @IsString()
  max_user_id: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiProperty({ required: false, default: 'Europe/Moscow' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  onboarding_completed?: boolean;
}
