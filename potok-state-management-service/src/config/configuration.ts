export default () => ({
  app: {
    name: process.env.APP_NAME || 'state-management-service',
    port: parseInt(process.env.APP_PORT || "3002", 10) ,
    env: process.env.NODE_ENV || 'development',
  },
  database: {
    url: process.env.ADMIN_SERVICE_URL || 'http://localhost:3000',
    apiKey: process.env.ADMIN_SERVICE_API_KEY || '',
  },
  webhook: {
    url: process.env.WEBHOOK_URL || '',
    secret: process.env.WEBHOOK_SECRET || '',
  },
  timezone: {
    default: process.env.DEFAULT_TIMEZONE || 'Europe/Moscow',
  },
});
