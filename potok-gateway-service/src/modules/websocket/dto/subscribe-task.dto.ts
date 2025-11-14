import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class SubscribeTaskDto {
  @IsNotEmpty()
  @IsString()
  @IsUUID()
  taskId: string;
}

export class UnsubscribeTaskDto {
  @IsNotEmpty()
  @IsString()
  @IsUUID()
  taskId: string;
}