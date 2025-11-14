import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
  appName: process.env.APP_NAME || 'potok-gateway-service',
  logLevel: process.env.LOG_LEVEL || 'debug',
  logFormat: process.env.LOG_FORMAT || 'json',
  metricsEnabled: process.env.METRICS_ENABLED === 'true',
  healthCheckEnabled: process.env.HEALTH_CHECK_ENABLED === 'true',
}));
