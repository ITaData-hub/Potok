// src/database/typeorm.config.ts
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import * as path from 'path';

// Загружаем .env
config();

export default new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5433', 10),
  username: process.env.DATABASE_USER || 'potok',
  password: process.env.DATABASE_PASSWORD || 'potok_secret_2024',
  database: process.env.DATABASE_NAME || 'potok_db',
  synchronize: false,
  logging: process.env.DATABASE_LOGGING === 'true',
  
  // ИСПРАВЛЕНО: Используем путь относительно корня проекта
  entities: [path.join(__dirname, 'entities', '*.entity{.ts,.js}')],
  migrations: [path.join(__dirname, 'migrations', '*{.ts,.js}')],
  subscribers: [],
  
  ssl: process.env.DATABASE_SSL === 'true' 
    ? { rejectUnauthorized: false } 
    : false,
});
