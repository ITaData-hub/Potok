import {
    Controller,
    Post,
    Body,
    Headers,
    HttpCode,
    HttpStatus,
    Logger,
    UseGuards,
    BadRequestException,
  } from '@nestjs/common';
  import { BotService } from './bot.service';
  import { MaxWebhookDto } from './dto/max-webhook.dto';
  import { MaxWebhookGuard } from '../auth/guards/max-webhook.guard';
  import { Public } from '../../common/decorators/public.decorator';
  
  @Controller('bot')
  export class BotController {
    private readonly logger = new Logger(BotController.name);
  
    constructor(private readonly botService: BotService) {}
  
    /**
     * Обработчик webhook от MAX Bot API
     * POST /api/v1/bot/webhook
     */
    // @Post('webhook')
    // @Public()
    // @UseGuards(MaxWebhookGuard)
    // @HttpCode(HttpStatus.OK)
    // async handleWebhook(
    //   @Body() update: MaxWebhookDto,
    //   @Headers('x-max-signature') signature: string,
    // ) {
    //   this.logger.debug(`Получен webhook: ${JSON.stringify(update)}`);
  
    //   try {
    //     await this.botService.processUpdate(update);
    //     return { ok: true };
    //   } catch (error) {
    //     this.logger.error(`Ошибка обработки webhook: ${error.message}`, error.stack);
    //     // Возвращаем 200 даже при ошибке, чтобы MAX не ретраил
    //     return { ok: false, error: error.message };
    //   }
    // }
  

  }
  