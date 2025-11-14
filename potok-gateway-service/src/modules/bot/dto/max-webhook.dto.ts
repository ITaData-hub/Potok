import { IsString, IsNumber, IsObject, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * MAX User DTO
 */
export class MaxUser {
  @IsNumber()
  id: number;

  @IsString()
  username: string;

  @IsString()
  @IsOptional()
  first_name?: string;

  @IsString()
  @IsOptional()
  last_name?: string;
}

/**
 * MAX Chat DTO
 */
export class MaxChat {
  @IsNumber()
  id: number;

  @IsString()
  type: string;
}

/**
 * MAX Message DTO
 */
export class MaxMessage {
  @IsNumber()
  message_id: number;

  @IsObject()
  @ValidateNested()
  @Type(() => MaxUser)
  from: MaxUser;

  @IsObject()
  @ValidateNested()
  @Type(() => MaxChat)
  chat: MaxChat;

  @IsNumber()
  date: number;

  @IsString()
  @IsOptional()
  text?: string;

  @IsString()
  @IsOptional()
  command?: string;
}

/**
 * MAX Callback Query DTO
 */
export class MaxCallbackQuery {
  @IsString()
  id: string;

  @IsObject()
  @ValidateNested()
  @Type(() => MaxUser)
  from: MaxUser;

  @IsObject()
  @ValidateNested()
  @Type(() => MaxMessage)
  message: MaxMessage;

  @IsString()
  data: string;
}

/**
 * MAX Webhook DTO
 */
export class MaxWebhookDto {
  @IsNumber()
  update_id: number;

  @IsObject()
  @ValidateNested()
  @Type(() => MaxMessage)
  @IsOptional()
  message?: MaxMessage;

  @IsObject()
  @ValidateNested()
  @Type(() => MaxCallbackQuery)
  @IsOptional()
  callback_query?: MaxCallbackQuery;
}
