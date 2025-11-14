import { IsString, IsArray, IsUrl, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateWebhookSubscriptionDto {
  @ApiProperty({
    description: 'URL для отправки webhook',
    example: 'https://example.com/webhook',
  })
  @IsUrl()
  url: string;

  @ApiProperty({
    description: 'Список событий на которые подписаться',
    example: ['state.changed', 'test.completed'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  events: string[];

  @ApiProperty({
    description: 'ID пользователя',
    example: 'user_12345',
    required: false,
  })
  @IsOptional()
  @IsString()
  userId?: string;
}
