import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET || 'change-me-in-production',
  expiresIn: process.env.JWT_EXPIRATION || '24h',
  refreshSecret:
    process.env.JWT_REFRESH_SECRET || 'change-me-in-production-refresh',
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRATION || '7d',
}));
