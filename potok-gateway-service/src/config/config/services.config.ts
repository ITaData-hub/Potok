import { registerAs } from '@nestjs/config';

export default registerAs('services', () => ({
  admin: {
    url: process.env.ADMIN_SERVICE_URL || 'http://localhost:3000',
    timeout: 5000,
  },
  state: {
    url: process.env.STATE_SERVICE_URL || 'http://localhost:3002',
    timeout: 5000,
  },
  task: {
    url: process.env.TASK_SERVICE_URL || 'http://localhost:3003',
    timeout: 5000,
  },
  maxBot: {
    token: process.env.MAX_BOT_TOKEN,
    webhookSecret: process.env.MAX_BOT_WEBHOOK_SECRET,
    apiBaseUrl: process.env.MAX_API_BASE_URL || 'https://api.max.app/v1',
  },
  circuitBreaker: {
    failureThreshold:
      parseInt(process.env.CIRCUIT_BREAKER_FAILURE_THRESHOLD || "5", 10),
    successThreshold:
      parseInt(process.env.CIRCUIT_BREAKER_SUCCESS_THRESHOLD || "2", 10),
    timeout: parseInt(process.env.CIRCUIT_BREAKER_TIMEOUT || "60000", 10),
  },
}));
