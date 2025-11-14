import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from '../../common/decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Генерация токена (для внутреннего использования)
   */
  @Post('token')
  @Public()
  @HttpCode(HttpStatus.OK)
  async generateToken(@Body() body: { userId: string; maxUserId: string }) {
    const token = this.authService.generateToken(body.userId, body.maxUserId);
    const refreshToken = this.authService.generateRefreshToken(
      body.userId,
      body.maxUserId,
    );

    return {
      access_token: token,
      refresh_token: refreshToken,
      token_type: 'Bearer',
      expires_in: 86400, // 24 часа
    };
  }

  /**
   * Обновление токена
   */
  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() body: { refresh_token: string }) {
    const decoded = await this.authService.validateToken(body.refresh_token);
    
    if (!decoded) {
      return { error: 'Invalid refresh token' };
    }

    const token = this.authService.generateToken(decoded.sub, decoded.maxUserId);

    return {
      access_token: token,
      token_type: 'Bearer',
      expires_in: 86400,
    };
  }
}
