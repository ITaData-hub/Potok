import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  url: process.env.EXTERNAL_DB_URL || 'http://localhost:3001',
  apiKey: process.env.EXTERNAL_DB_API_KEY || '',
  timeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '30000', 10),
  retryAttempts: parseInt(process.env.DB_RETRY_ATTEMPTS || '3', 10),
}));
