export default () => ({
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),  // ✅ Исправлено
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0', 10),         // ✅ Исправлено
    keyPrefix: 'potok:',
    retryStrategy: (times: number) => Math.min(times * 50, 2000),
  },
});
