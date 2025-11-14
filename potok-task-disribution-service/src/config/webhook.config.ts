import { registerAs } from '@nestjs/config';

export default registerAs('webhook', () => ({
  deliveryTimeout: parseInt(process.env.WEBHOOK_DELIVERY_TIMEOUT || '30000', 10),
  maxRetries: parseInt(process.env.WEBHOOK_MAX_RETRIES || '3', 10),
  retryDelay: parseInt(process.env.WEBHOOK_RETRY_DELAY || '5000', 10),
  secretKey: process.env.WEBHOOK_SECRET_KEY || 'default-secret',
}));
