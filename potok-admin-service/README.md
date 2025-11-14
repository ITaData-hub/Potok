# Potok Admin Service

Централизованный сервис управления базой данных PostgreSQL и глобальным Redis кешем для микросервисной архитектуры проекта **Potok**.

## 📋 Описание

Admin Service — это **центр управления данными** для всех микросервисов в экосистеме Potok. Сервис обеспечивает:

- 💾 **Управление PostgreSQL БД** - CRUD операции для всех сервисов
- 🗄️ **Глобальный Redis кеш** - синхронизация данных между микросервисами
- 🔄 **Система миграций** - управление схемой БД через API и CLI
- 💼 **Бэкапы БД** - автоматическое резервное копирование
- 🔐 **RBAC** - ролевой контроль доступа на уровне микросервисов
- 🔑 **API Key аутентификация** - безопасное межсервисное взаимодействие
- 📝 **Журналирование** - аудит всех критичных операций
- 📊 **Мониторинг** - health checks и Prometheus метрики

---

## 🏗️ Архитектура

### Место в системе Potok

```
┌─────────────────────────────────────────────────┐
│          Admin Service (3000)                   │
│  ┌──────────────────────────────────────────┐   │
│  │  Auth Module (API Keys, JWT)             │   │
│  │  Database Module (CRUD, Migrations)      │   │
│  │  Redis Module (Global Cache)             │   │
│  │  Monitoring Module (Health, Metrics)     │   │
│  └──────────────────────────────────────────┘   │
└─────────┬──────────────────────────┬────────────┘
          │                          │
          ▼                          ▼
    ┌──────────┐              ┌────────────┐
    │PostgreSQL│              │Redis Global│
    │    DB    │              │   Cache    │
    └──────────┘              └────────────┘
          ▲                          ▲
          │                          │
          └──────────┬───────────────┘
                     │
         (используется всеми сервисами)
                     │
    ┌────────────────┼────────────────┐
    │                │                │
    ▼                ▼                ▼
┌─────────┐    ┌─────────┐    ┌─────────┐
│ Gateway │    │  State  │    │  Task   │
│ Service │    │ Service │    │ Service │
└─────────┘    └─────────┘    └─────────┘
```

### Модули

```
src/
├── modules/
│   ├── database/           # Управление PostgreSQL
│   │   ├── database.service.ts
│   │   ├── database.controller.ts
│   │   ├── entities/       # TypeORM entities
│   │   └── migrations/     # Миграции БД
│   ├── redis/              # Глобальный Redis кеш
│   │   ├── redis.service.ts
│   │   ├── redis.controller.ts
│   │   └── constants/
│   ├── auth/               # Аутентификация
│   │   ├── auth.service.ts
│   │   ├── jwt.strategy.ts
│   │   ├── local.strategy.ts
│   │   ├── guards/
│   │   └── decorators/
│   ├── monitoring/         # Мониторинг
│   │   ├── health.controller.ts
│   │   ├── metrics.controller.ts
│   │   └── metrics.service.ts
│   └── common/             # Общие компоненты
│       ├── filters/
│       ├── interceptors/
│       └── pipes/
└── config/                 # Конфигурация
```

---

## 🛠️ Технологический стек

| Компонент | Версия | Назначение |
|-----------|--------|------------|
| NestJS | 11.x | Backend фреймворк |
| TypeORM | Latest | ORM для PostgreSQL |
| PostgreSQL | 13+ | Основная база данных |
| Redis | 7+ | Глобальный кеш |
| ioredis | 5.3.2 | Redis клиент |
| Node.js | 20 Alpine | Runtime окружение |
| TypeScript | 5.7 | Язык разработки |
| Winston | 3.18.3 | Логирование |
| Passport & JWT | 11.0.5 | Аутентификация |

---

## 📦 Быстрый старт

### Требования

- Node.js ≥20
- npm ≥10
- Docker & Docker Compose
- PostgreSQL 13+
- Redis 7+

### Установка

```bash
# 1. Клонирование репозитория
git clone https://github.com/ITaData-hub/potok-admin-service.git
cd potok-admin-service
git checkout dev

# 2. Установка зависимостей
npm ci

# 3. Настройка переменных окружения
cp .env.example .env
nano .env  # Отредактируйте значения

# 4. Запуск PostgreSQL и Redis
docker-compose up -d postgres redis

# 5. Применение миграций
npm run migration:run

# 6. Запуск приложения (dev)
npm run start:dev
```

Приложение будет доступно на `http://localhost:3000`

### Docker Compose (рекомендуется)

```bash
# Запуск всех сервисов (Admin + PostgreSQL + Redis + Nginx)
docker-compose up -d

# Просмотр логов
docker-compose logs -f admin-service

# Остановка
docker-compose down
```

---

## ⚙️ Конфигурация

### Основные переменные (.env)

```bash
# Application
NODE_ENV=development
PORT=3000
API_PREFIX=api/v1

# PostgreSQL Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=admin
DB_PASSWORD=your-secure-password
DB_DATABASE=potok_db
DB_SYNCHRONIZE=false  # Использовать миграции!
DB_LOGGING=false
DB_SSL=false

# Redis Global Cache
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_KEY_PREFIX=potok:

# JWT Authentication
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# API Keys для микросервисов
API_KEYS=gateway-service-key,state-service-key,task-service-key

# Migrations
AUTO_RUN_MIGRATIONS=false

# CORS
CORS_ORIGIN=*

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
```

---

## 📡 API Endpoints

### Аутентификация

| Метод | Endpoint | Описание |
|-------|----------|----------|
| POST | `/auth/login` | Вход пользователя |
| POST | `/auth/register` | Регистрация |
| POST | `/auth/refresh` | Обновление токена |
| GET | `/auth/profile` | Профиль пользователя |

### Database Management

| Метод | Endpoint | Описание |
|-------|----------|----------|
| GET | `/api/v1/db/:entity/:id` | Получить запись по ID |
| GET | `/api/v1/db/:entity` | Получить все записи |
| POST | `/api/v1/db/:entity` | Создать запись |
| PUT | `/api/v1/db/:entity/:id` | Обновить запись |
| DELETE | `/api/v1/db/:entity/:id` | Удалить запись |

### Migrations

| Метод | Endpoint | Описание |
|-------|----------|----------|
| GET | `/api/v1/db/migration/status` | Статус миграций |
| GET | `/api/v1/db/migration/pending` | Список ожидающих |
| GET | `/api/v1/db/migration/executed` | История выполненных |
| POST | `/api/v1/db/migration/apply` | Применить миграции |
| POST | `/api/v1/db/migration/revert` | Откатить последнюю |

### Redis Cache

| Метод | Endpoint | Описание |
|-------|----------|----------|
| POST | `/api/v1/redis/set` | Установить значение |
| POST | `/api/v1/redis/get` | Получить значение |
| POST | `/api/v1/redis/del` | Удалить ключ |
| GET | `/api/v1/redis/usage` | Статистика использования |
| POST | `/api/v1/redis/queue/push` | Добавить в очередь |
| POST | `/api/v1/redis/queue/pop` | Получить из очереди |

### Health & Monitoring

| Метод | Endpoint | Описание |
|-------|----------|----------|
| GET | `/health` | Full health check |
| GET | `/ready` | Readiness probe |
| GET | `/metrics` | Prometheus метрики |

---

## 💡 Примеры использования

### Создание пользователя

```bash
curl -X POST http://localhost:3000/api/v1/db/users \
  -H "Content-Type: application/json" \
  -H "x-api-key: gateway-service-key" \
  -d '{
    "username": "newuser",
    "email": "user@example.com",
    "role": "user"
  }'
```

### Получение данных

```bash
curl -X GET http://localhost:3000/api/v1/db/users/1 \
  -H "x-api-key: gateway-service-key"
```

### Установка значения в Redis

```bash
curl -X POST http://localhost:3000/api/v1/redis/set \
  -H "Content-Type: application/json" \
  -H "x-api-key: gateway-service-key" \
  -d '{
    "key": "user:1:profile",
    "value": {"name": "John", "email": "john@example.com"},
    "ttl": 3600
  }'
```

### Применение миграций

```bash
# Через API
curl -X POST http://localhost:3000/api/v1/db/migration/apply \
  -H "x-api-key: gateway-service-key"

# Через CLI
npm run migration:run
```

---

## 🗄️ Управление миграциями

### Создание миграции

```bash
# Автоматическая генерация из изменений entities
npm run migration:generate -- -n AddNewFields

# Создание пустой миграции
npm run migration:create -- -n CreateUsersTable
```

### Структура миграции

```typescript
// src/database/migrations/1699000000000-CreateUsersTable.ts
import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateUsersTable1699000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'username',
            type: 'varchar',
            isUnique: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('users');
  }
}
```

### Применение миграций

```bash
# Статус
npm run migration:show

# Применить все
npm run migration:run

# Откатить последнюю
npm run migration:revert
```

---

## 🔒 Безопасность

### API Key аутентификация

Для межсервисного взаимодействия используются API ключи:

```bash
# Заголовок запроса
x-api-key: gateway-service-key

# Проверка происходит через guard
@UseGuards(ApiKeyGuard)
@Post('db/users')
async createUser(@Body() data: CreateUserDto) {
  return this.dbService.create('users', data);
}
```

### RBAC - Роли и права

| Роль | Разрешения |
|------|-----------|
| admin | Полный доступ ко всем операциям |
| developer | Чтение/запись БД, миграции |
| user | Ограниченный доступ к данным |
| service | Межсервисное взаимодействие |

### Защита эндпоинтов

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'developer')
@Post('migration/apply')
async applyMigrations() {
  // Только администраторы
}
```

---

## 📊 Мониторинг

### Health Check

```bash
curl http://localhost:3000/health
```

**Ответ:**
```json
{
  "status": "ok",
  "info": {
    "database": {
      "status": "up",
      "connection": true
    },
    "redis": {
      "status": "up",
      "memory": "5.2MB"
    }
  },
  "details": {
    "uptime": 123456,
    "timestamp": "2025-11-10T12:45:00Z"
  }
}
```

### Prometheus метрики

```
# Database queries
db_query_duration_seconds{operation="select"} 0.015
db_connections_active 5
db_connections_total 10

# Redis operations
redis_command_duration_seconds{command="get"} 0.002
redis_memory_used_bytes 5452880

# HTTP requests
http_requests_total{method="POST",route="/api/v1/db/users",status="200"} 42
```

### Логирование

Структурированные JSON логи:

```json
{
  "timestamp": "2025-11-10T12:45:00.000Z",
  "level": "info",
  "context": "DatabaseService",
  "message": "User created successfully",
  "userId": "uuid-123",
  "operation": "create",
  "entity": "users"
}
```

---

## 🐳 Docker

### Production образ

```bash
# Сборка
docker build -t potok-admin:latest .

# Запуск
docker run -d \
  --name potok-admin \
  -p 3000:3000 \
  --env-file .env \
  --link postgres:postgres \
  --link redis:redis \
  potok-admin:latest
```

### Docker Compose

```yaml
version: '3.8'

services:
  admin-service:
    build: .
    ports:
      - '3000:3000'
    environment:
      - NODE_ENV=production
      - DB_HOST=postgres
      - REDIS_HOST=redis
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: potok_db
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - '5432:5432'

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    ports:
      - '6379:6379'

  nginx:
    image: nginx:alpine
    ports:
      - '80:80'
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf

volumes:
  postgres_data:
  redis_data:
```

---

## ☸️ Kubernetes

### Развертывание

```bash
# Создание namespace
kubectl create namespace potok

# Применить манифесты
kubectl apply -f k8s/ -n potok

# Проверить статус
kubectl get pods -n potok -l app=admin-service
kubectl get svc -n potok admin-service

# Просмотр логов
kubectl logs -f -n potok -l app=admin-service
```

### ConfigMap и Secrets

```bash
# Создать secret для БД
kubectl create secret generic db-credentials \
  --from-literal=username=admin \
  --from-literal=password=secret \
  -n potok

# Создать configmap
kubectl create configmap admin-config \
  --from-file=.env.production \
  -n potok
```

---

## 🧪 Тестирование

```bash
# Unit тесты
npm run test

# E2E тесты
npm run test:e2e

# Coverage
npm run test:cov

# Watch mode
npm run test:watch
```

---

## 🔧 Разработка

### Команды

```bash
# Development
npm run start:dev          # Hot-reload
npm run start:debug        # С отладчиком

# Build & Production
npm run build
npm run start:prod

# Migrations
npm run migration:generate -- -n MigrationName
npm run migration:create -- -n MigrationName
npm run migration:run
npm run migration:revert
npm run migration:show

# Database
npm run db:seed            # Заполнить тестовыми данными (dev only!)

# Code quality
npm run lint
npm run lint:fix
npm run format

# Docker
docker-compose up -d
docker-compose logs -f
docker-compose down
```

---

## 🤝 Интеграция с микросервисами

Admin Service предоставляет централизованное хранилище для:

### Gateway Service
- JWT токены и refresh токены
- Сессии пользователей
- Настройки аутентификации

### State Management Service
- Статусы задач и объектов
- История изменений состояний
- Подписки на вебхуки

### Task Distribution Service
- Задачи и их параметры
- Исполнители и их загрузка
- Метрики распределения

**Все сервисы используют:**
- API Key аутентификацию для безопасности
- Retry механизм при сбоях
- Кеширование в Redis для производительности

---

## 🐛 Troubleshooting

### Проблема: БД недоступна

```bash
# Проверить соединение
docker-compose logs postgres

# Перезапустить БД
docker-compose restart postgres

# Проверить миграции
npm run migration:show
```

### Проблема: Redis недоступен

```bash
# Проверить статус
docker-compose logs redis

# Очистить кеш
docker-compose exec redis redis-cli FLUSHALL

# Перезапустить
docker-compose restart redis
```

### Проблема: Миграция не применяется

```bash
# Проверить статус
npm run migration:show

# Посмотреть лог
npm run migration:run -- --verbose

# Откатить и применить заново
npm run migration:revert
npm run migration:run
```

---

## 📚 Документация

- [API Documentation](http://localhost:3000/api/docs) - Swagger UI
- [NestJS Documentation](https://docs.nestjs.com)
- [TypeORM Documentation](https://typeorm.io)
- [Redis Documentation](https://redis.io/documentation)

---

## 👤 Автор

**Mikhail**  
GitHub: [@ITaData-hub](https://github.com/ITaData-hub)  
Email: itadata602@gmail.com

---

## 📄 Лицензия

UNLICENSED - частный проект

---

**Версия:** 1.0.0  
**Последнее обновление:** 10 ноября 2025
