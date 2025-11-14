# 🔄 Potok State Management Service

**Управление состояниями и синхронизация данных в реальном времени**

Микросервис для отслеживания статусов задач, пользователей и синхронизации состояний между компонентами системы Potok с поддержкой webhook-уведомлений.

[![NestJS](https://img.shields.io/badge/NestJS-11.x-red?logo=nestjs)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20-green?logo=node.js)](https://nodejs.org/)
[![Redis](https://img.shields.io/badge/Redis-7+-red?logo=redis)](https://redis.io/)

---

## 📋 Содержание

- [О проекте](#-о-проекте)
- [Возможности](#-возможности)
- [Архитектура](#-архитектура)
- [Технологический стек](#-технологический-стек)
- [Быстрый старт](#-быстрый-старт)
- [Конфигурация](#-конфигурация)
- [API Документация](#-api-документация)
- [Модули системы](#-модули-системы)
- [Webhook система](#-webhook-система)
- [Интеграция с сервисами](#-интеграция-с-сервисами)
- [Кеширование](#-кеширование)
- [Мониторинг](#-мониторинг)

---

## 🎯 О проекте

State Management Service — это **центральный хуб управления состояниями** в микросервисной архитектуре Potok. Сервис отвечает за:

- Отслеживание статусов задач и их изменений
- Синхронизацию состояний между микросервисами
- Отправку webhook-уведомлений о событиях
- Кеширование данных состояний для быстрого доступа
- Журналирование истории изменений

**Версия:** 1.0.0  
**Порт по умолчанию:** 3002  
**Ветка разработки:** dev

---

## ✨ Возможности

### 📊 Управление состояниями

- **State tracking** - отслеживание статусов объектов
  - Задачи (created, in_progress, completed, failed)
  - Пользователи (online, offline, busy)
  - Системные процессы (pending, running, finished)
- **History logging** - история всех изменений состояний
- **State transitions** - валидация переходов между состояниями
- **Batch updates** - массовое обновление состояний
- **Query API** - гибкий API для запросов состояний

### 🔔 Webhook система

- **Event subscription** - подписка на события
  - entity.created
  - entity.updated
  - entity.deleted
  - custom.event
- **Guaranteed delivery** - гарантированная доставка
  - Автоматический retry с exponential backoff
  - Максимум 3 попытки по умолчанию
  - Таймаут доставки 30 секунд
- **HMAC-SHA256 signatures** - подпись для верификации
- **Failure handling** - обработка ошибок
  - Счетчик неудачных попыток
  - Деактивация при превышении лимита
- **Management API** - управление подписками
  - Создание, удаление, листинг webhooks
  - Получение статуса подписки

### 💾 Кеширование

- **Dual Redis** - двухуровневое кеширование
  - Локальный Redis для быстрого доступа
  - Глобальный Redis для синхронизации
- **Automatic fallback** - автоматический переключение
  - При недоступности глобального использует локальный
  - Прозрачное переключение без ошибок
- **TTL management** - контроль времени жизни кеша
- **Pattern-based caching** - кеширование по паттернам
- **Cache invalidation** - автоматическая инвалидация

### 🔗 Интеграция

- **External Database Service** - интеграция с DB через REST
  - CRUD операции с кешированием
  - Retry механизм с exponential backoff
  - Автоматическая инвалидация кеша
- **Event broadcasting** - рассылка событий
- **Service discovery** - поиск других сервисов

---

## 🏗️ Архитектура

### Роль в системе

```
┌──────────────┐
│   Gateway    │
│   Service    │
└──────┬───────┘
       │
       ▼
┌───────────────────────────────────────┐
│ State Management Service (Port 3002)  │
│  ┌─────────────────────────────────┐  │
│  │ State Manager                   │  │
│  │ ├─ Status tracking              │  │
│  │ ├─ History logging              │  │
│  │ ├─ Transition validation        │  │
│  │ └─ Query engine                 │  │
│  └─────────────────────────────────┘  │
│  ┌─────────────────────────────────┐  │
│  │ Webhook Manager                 │  │
│  │ ├─ Subscription management      │  │
│  │ ├─ Event dispatcher             │  │
│  │ ├─ Retry handler                │  │
│  │ └─ HMAC signer                  │  │
│  └─────────────────────────────────┘  │
│  ┌─────────────────────────────────┐  │
│  │ Cache Manager                   │  │
│  │ ├─ Local Redis client           │  │
│  │ ├─ Global Redis client          │  │
│  │ ├─ Fallback logic               │  │
│  │ └─ TTL manager                  │  │
│  └─────────────────────────────────┘  │
│  ┌─────────────────────────────────┐  │
│  │ External DB Client              │  │
│  │ ├─ REST API client              │  │
│  │ ├─ Retry mechanism              │  │
│  │ └─ Cache integration            │  │
│  └─────────────────────────────────┘  │
└────────┬────────────────┬─────────────┘
         │                │
         ▼                ▼
  ┌──────────┐    ┌──────────────┐
  │  Redis   │    │  Admin       │
  │  Local   │    │  Service     │
  │  Cache   │    │  (DB & Redis)│
  └──────────┘    └──────────────┘
```

### Структура модулей

```
src/
├── modules/
│   ├── state/                 # State management
│   │   ├── state.module.ts
│   │   ├── state.controller.ts
│   │   ├── state.service.ts
│   │   ├── dto/
│   │   │   ├── create-state.dto.ts
│   │   │   └── update-state.dto.ts
│   │   └── entities/
│   │       └── state.entity.ts
│   │
│   ├── webhook/               # Webhook system
│   │   ├── webhook.module.ts
│   │   ├── webhook.controller.ts
│   │   ├── webhook.service.ts
│   │   ├── webhook-subscription.service.ts
│   │   └── dto/
│   │       ├── webhook-subscription.dto.ts
│   │       └── webhook-event.dto.ts
│   │
│   ├── redis/                 # Redis integration
│   │   ├── redis.module.ts
│   │   ├── redis.service.ts
│   │   └── redis.config.ts
│   │
│   ├── database/              # External DB client
│   │   ├── database.module.ts
│   │   └── external-database.service.ts
│   │
│   ├── logger/                # Winston logging
│   │   ├── logger.module.ts
│   │   └── logger.config.ts
│   │
│   └── health/                # Health checks
│       ├── health.module.ts
│       ├── health.controller.ts
│       └── indicators/
│           ├── redis-health.indicator.ts
│           └── external-db-health.indicator.ts
│
├── common/
│   ├── decorators/
│   ├── filters/
│   ├── interceptors/
│   └── pipes/
│
├── config/
│   ├── app.config.ts
│   ├── redis.config.ts
│   ├── database.config.ts
│   └── webhook.config.ts
│
├── app.module.ts
└── main.ts
```

---

## 🛠️ Технологический стек

### Core

| Технология | Версия | Назначение |
|-----------|--------|------------|
| **NestJS** | 11.0.1 | Backend фреймворк |
| **TypeScript** | 5.7.3 | Типизация |
| **Node.js** | 20 | Runtime |

### Основные зависимости

| Пакет | Версия | Использование |
|-------|--------|--------------|
| `@nestjs/axios` | 4.0.1 | HTTP клиент |
| `@nestjs/config` | 4.0.2 | Конфигурация |
| `@nestjs/swagger` | 11.2.1 | API документация |
| `@nestjs/terminus` | 11.0.0 | Health checks |
| `@nestjs/throttler` | 6.4.0 | Rate limiting |
| `axios` | 1.13.1 | HTTP запросы |
| `class-validator` | 0.14.2 | Валидация |
| `class-transformer` | 0.5.1 | Трансформация |
| `compression` | 1.8.1 | GZIP сжатие |
| `helmet` | 8.1.0 | Безопасность |
| `winston` | 3.18.3 | Логирование |
| `nest-winston` | 1.10.2 | Winston интеграция |

---

## 🚀 Быстрый старт

### Требования

- Node.js ≥ 20.x
- Redis ≥ 7.x (локальный)
- Docker ≥ 24.x (опционально)
- Доступ к Admin Service

### Установка

```bash
# Клонирование
git clone https://github.com/ITaData-hub/potok-state-management-service.git
cd potok-state-management-service

# Переключение на dev
git checkout dev

# Установка зависимостей
npm ci
```

### Конфигурация

```bash
cp .env.example .env
nano .env
```

Минимальная конфигурация:

```env
NODE_ENV=development
PORT=3002
APP_NAME=potok-state-management-service

# Logging
LOG_LEVEL=debug
LOG_FORMAT=pretty

# External DB Service
EXTERNAL_DB_URL=http://localhost:3000
EXTERNAL_DB_API_KEY=state-service-key
DB_CONNECTION_TIMEOUT=30000
DB_RETRY_ATTEMPTS=3

# Redis Local
REDIS_LOCAL_HOST=localhost
REDIS_LOCAL_PORT=6379
REDIS_LOCAL_DB=0
REDIS_LOCAL_PASSWORD=

# Redis Global (optional)
REDIS_GLOBAL_ENABLED=false
REDIS_GLOBAL_HOST=redis.example.com
REDIS_GLOBAL_PORT=6379
REDIS_GLOBAL_DB=1

# Webhooks
WEBHOOK_DELIVERY_TIMEOUT=30000
WEBHOOK_MAX_RETRIES=3
WEBHOOK_RETRY_DELAY=5000
WEBHOOK_SECRET_KEY=your-webhook-secret
```

### Запуск Redis

```bash
# Docker
docker run -d -p 6379:6379 redis:7-alpine

# Или через Docker Compose
docker-compose up -d redis-local
```

### Запуск приложения

```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

### Проверка

```bash
# Health check
curl http://localhost:3002/health

# Swagger docs
open http://localhost:3002/api-docs
```

---

## ⚙️ Конфигурация

### Переменные окружения

#### Application

```env
NODE_ENV=development
PORT=3002
APP_NAME=potok-state-management-service
```

#### External Database

```env
EXTERNAL_DB_URL=http://localhost:3000
EXTERNAL_DB_API_KEY=state-service-key
DB_CONNECTION_TIMEOUT=30000
DB_RETRY_ATTEMPTS=3
```

#### Redis Local

```env
REDIS_LOCAL_HOST=localhost
REDIS_LOCAL_PORT=6379
REDIS_LOCAL_DB=0
REDIS_LOCAL_PASSWORD=
```

#### Redis Global

```env
REDIS_GLOBAL_ENABLED=false
REDIS_GLOBAL_HOST=redis.example.com
REDIS_GLOBAL_PORT=6379
REDIS_GLOBAL_DB=1
REDIS_GLOBAL_PASSWORD=
```

#### Webhooks

```env
WEBHOOK_DELIVERY_TIMEOUT=30000
WEBHOOK_MAX_RETRIES=3
WEBHOOK_RETRY_DELAY=5000
WEBHOOK_SECRET_KEY=your-webhook-secret
```

#### Logging

```env
LOG_LEVEL=debug
LOG_FORMAT=pretty  # или json для production
```

---

## 📚 API Документация

### Swagger UI

```
http://localhost:3002/api-docs
```

### States API

| Метод | Endpoint | Описание |
|-------|----------|---------|
| GET | `/api/v1/states/:entity` | Получить состояние сущности |
| GET | `/api/v1/states/:entity/:id` | Получить состояние по ID |
| POST | `/api/v1/states/:entity` | Создать состояние |
| PUT | `/api/v1/states/:entity/:id` | Обновить состояние |
| DELETE | `/api/v1/states/:entity/:id` | Удалить состояние |
| GET | `/api/v1/states/:entity/:id/history` | История изменений |

### Webhooks API

| Метод | Endpoint | Описание |
|-------|----------|---------|
| POST | `/api/v1/webhooks/subscriptions` | Создать подписку |
| GET | `/api/v1/webhooks/subscriptions` | Все подписки |
| GET | `/api/v1/webhooks/subscriptions/:id` | Подписка по ID |
| DELETE | `/api/v1/webhooks/subscriptions/:id` | Удалить подписку |

### Health

| Метод | Endpoint | Описание |
|-------|----------|---------|
| GET | `/health` | Полная проверка |
| GET | `/health/liveness` | Liveness probe |
| GET | `/health/readiness` | Readiness probe |

### Примеры

#### Создание состояния

```bash
curl -X POST http://localhost:3002/api/v1/states/task \
  -H "Content-Type: application/json" \
  -H "x-api-key: gateway-service-key" \
  -d '{
    "entityId": "task_123",
    "status": "in_progress",
    "metadata": {
      "assignee": "user_789",
      "priority": "high"
    }
  }'
```

#### Создание webhook подписки

```bash
curl -X POST http://localhost:3002/api/v1/webhooks/subscriptions \
  -H "Content-Type: application/json" \
  -H "x-api-key: gateway-service-key" \
  -d '{
    "url": "https://your-app.com/webhook",
    "events": ["entity.created", "entity.updated"],
    "secret": "your-webhook-secret",
    "description": "Task status updates"
  }'
```

---

## 🔔 Webhook система

### События

- **entity.created** - сущность создана
- **entity.updated** - сущность обновлена
- **entity.deleted** - сущность удалена
- **custom.event** - пользовательское событие

### Формат webhook payload

```json
{
  "event": "entity.updated",
  "timestamp": "2025-11-10T10:00:00.000Z",
  "data": {
    "entity": "task",
    "id": "task_123",
    "previousStatus": "pending",
    "newStatus": "in_progress",
    "metadata": {}
  },
  "signature": "sha256=..."
}
```

### HMAC Signature

Webhook подписывается с помощью HMAC-SHA256:

```typescript
const signature = crypto
  .createHmac('sha256', webhookSecret)
  .update(JSON.stringify(payload))
  .digest('hex');

// В заголовке
headers['X-Webhook-Signature'] = `sha256=${signature}`;
```

### Retry механизм

- **Exponential backoff**: 5s, 10s, 20s
- **Max retries**: 3 попытки
- **Timeout**: 30 секунд на попытку
- **Деактивация**: после 10 неудачных попыток подряд

---

## 🔗 Интеграция с сервисами

### Admin Service

State Management Service использует Admin Service для персистентного хранения:

```typescript
// Сохранение состояния в БД
const state = await this.externalDbService.create('states', {
  entityType: 'task',
  entityId: 'task_123',
  status: 'in_progress',
  timestamp: new Date(),
});

// С кешированием
const cachedState = await this.externalDbService.get(
  'states',
  'state_id_456',
  true  // enable cache
);
```

### Gateway Service

Gateway вызывает State Management для обновления статусов:

```bash
# Gateway -> State Management
POST http://localhost:3002/api/v1/states/task
{
  "entityId": "task_123",
  "status": "completed"
}
```

---

## 💾 Кеширование

### Двухуровневая стратегия

```typescript
// Попытка получить из локального Redis
let value = await this.redis.get(key, RedisType.LOCAL);

if (!value && this.redis.isGlobalEnabled()) {
  // Fallback на глобальный Redis
  value = await this.redis.get(key, RedisType.GLOBAL);
  
  if (value) {
    // Синхронизация в локальный
    await this.redis.set(key, value, ttl, RedisType.LOCAL);
  }
}
```

### TTL управление

```typescript
// Кеш состояния на 5 минут
await this.redis.set('state:task:123', stateData, 300);

// Кеш списка на 1 минуту
await this.redis.set('state:list:tasks', tasksList, 60);

// Проверка существования
const exists = await this.redis.exists('state:task:123');
```

### Инвалидация кеша

```typescript
// При обновлении состояния
await this.updateState(entityId, newStatus);

// Автоматическая инвалидация
await this.redis.del(`state:${entityType}:${entityId}`);
await this.redis.del(`state:list:${entityType}`);
```

---

## 📊 Мониторинг

### Health Checks

```bash
# Liveness
curl http://localhost:3002/health/liveness
# {"status":"ok"}

# Readiness
curl http://localhost:3002/health/readiness
# {"ready":true,"redis":true,"externalDb":true}

# Full health
curl http://localhost:3002/health
```

### Логирование

Winston JSON логи:

```json
{
  "timestamp": "2025-11-10T10:00:00.000Z",
  "level": "info",
  "context": "StateService",
  "message": "State updated successfully",
  "entityType": "task",
  "entityId": "task_123",
  "previousStatus": "pending",
  "newStatus": "in_progress"
}
```

---

## ✅ Тестирование

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Coverage
npm run test:cov
```

---

## 🐳 Docker

```bash
# Запуск
docker-compose up -d

# Логи
docker-compose logs -f state-service

# Остановка
docker-compose down
```

---

## 📞 Поддержка

- **Email:** itadata602@gmail.com
- **GitHub:** [@ITaData-hub](https://github.com/ITaData-hub)
- **Repository:** [potok-state-management-service](https://github.com/ITaData-hub/potok-state-management-service)

---

## 📄 Лицензия

**UNLICENSED** - частный проект

---

**Последнее обновление:** 10 ноября 2025  
**Версия:** 1.0.0  
**Ветка:** dev
