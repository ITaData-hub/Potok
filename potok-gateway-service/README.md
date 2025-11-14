# Potok Gateway Service

API Gateway для микросервисной архитектуры проекта **Potok** — бот для мессенджера Max по оптимизации распределения и выполнения задач.

## 📋 Описание

Gateway Service — это **централизованная точка входа** для всех внешних запросов в микросервисную архитектуру Potok. Сервис обеспечивает:

- 🔀 **Маршрутизацию запросов** между микросервисами (Admin, State, Task)
- 🔐 **JWT-аутентификацию** и авторизацию пользователей
- 🤖 **Интеграцию с MAX Bot API** для обработки webhook-событий
- ⚡ **WebSocket-соединения** для real-time коммуникаций через Socket.IO
- 🛡️ **Rate limiting** и защиту от перегрузок (100 req/min)
- 📊 **Централизованное логирование** с correlation ID
- 🔄 **Circuit Breaker** для повышения отказоустойчивости
- 💾 **Redis-кеширование** для оптимизации производительности

---

## 🏗️ Архитектура

### Место в системе Potok

```
┌────────────────┐
│   MAX Bot      │ (вебхуки, команды)
└────────┬───────┘
         │
         ▼
┌─────────────────────────────────────┐
│    Gateway Service (3001)           │
│  ┌──────────────────────────────┐   │
│  │ Auth Module (JWT)            │   │
│  │ Bot Module (MAX Bot API)     │   │
│  │ WebSocket Module (Socket.IO) │   │
│  │ Redis Module (Cache)         │   │
│  │ Monitoring (Metrics)         │   │
│  └──────────────────────────────┘   │
└─────────┬───────┬─────────┬─────────┘
          │       │         │
          ▼       ▼         ▼
    ┌─────────┐ ┌─────────┐ ┌─────────┐
    │ Admin   │ │ State   │ │  Task   │
    │ Service │ │ Service │ │ Service │
    │ (3000)  │ │ (3002)  │ │ (3003)  │
    └─────────┘ └─────────┘ └─────────┘
```

### Модули

```
src/
├── modules/
│   ├── auth/          # JWT-аутентификация и авторизация
│   ├── bot/           # Интеграция с MAX Bot API
│   ├── gateway/       # Маршрутизация между микросервисами
│   ├── websocket/     # WebSocket-соединения (Socket.IO)
│   ├── redis/         # Redis-клиент и кеширование
│   ├── monitoring/    # Метрики и health checks
│   └── logging/       # Централизованное логирование
├── common/
│   ├── decorators/    # Кастомные декораторы
│   ├── filters/       # Exception filters
│   ├── guards/        # Guards для защиты эндпоинтов
│   ├── interceptors/  # Interceptors (timeout, transform)
│   ├── interfaces/    # TypeScript интерфейсы
│   └── middleware/    # Middleware (correlation-id)
└── config/            # Конфигурационные файлы
```

---

## 🛠️ Технологический стек

| Компонент | Версия | Назначение |
|-----------|--------|------------|
| NestJS | 11.x | Backend фреймворк |
| Node.js | 20 Alpine | Runtime окружение |
| TypeScript | 5.7 | Язык разработки |
| Socket.IO | 4.8.1 | WebSocket коммуникация |
| Redis | 7 | Кеширование и сессии |
| @maxhub/max-bot-api | 0.2.1 | Интеграция с MAX Bot |
| Passport & JWT | 11.0.5 | Аутентификация |
| Winston | 3.18.3 | Структурированное логирование |
| Prometheus | 15.1.3 | Метрики |
| Nginx | - | Reverse proxy |

---

## 📦 Быстрый старт

### Требования

- Node.js ≥20
- npm ≥10
- Docker & Docker Compose
- Redis 7+

### Установка

```bash
# 1. Клонирование репозитория
git clone https://github.com/ITaData-hub/potok-gateway-service.git
cd potok-gateway-service
git checkout dev

# 2. Установка зависимостей
npm ci

# 3. Настройка переменных окружения
cp .env.example .env
nano .env  # Отредактируйте значения

# 4. Запуск Redis
docker run -d -p 6379:6379 redis:7-alpine

# 5. Запуск приложения (dev)
npm run start:dev
```

Приложение будет доступно на `http://localhost:3001`

### Docker Compose (рекомендуется)

```bash
# Запуск всех сервисов (Gateway + Redis + Nginx)
docker-compose up -d

# Просмотр логов
docker-compose logs -f

# Остановка
docker-compose down
```

---

## ⚙️ Конфигурация

### Основные переменные (.env)

```bash
# Application
NODE_ENV=development
PORT=3001
APP_NAME=potok-gateway-service

# JWT Authentication
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRATION=24h
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production
JWT_REFRESH_EXPIRATION=7d

# MAX Bot API
MAX_BOT_TOKEN=your-max-bot-token-from-max-platform

# Microservices URLs
ADMIN_SERVICE_URL=http://localhost:3000
ADMIN_SERVICE_API_KEY=gateway-service-key
STATE_SERVICE_URL=http://localhost:3002
TASK_SERVICE_URL=http://localhost:3003

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_KEY_PREFIX=potok:

# Circuit Breaker
CIRCUIT_BREAKER_FAILURE_THRESHOLD=5
CIRCUIT_BREAKER_SUCCESS_THRESHOLD=2
CIRCUIT_BREAKER_TIMEOUT=60000

# Rate Limiting
THROTTLE_TTL=60
THROTTLE_LIMIT=100

# Logging
LOG_LEVEL=debug
LOG_FORMAT=json

# Monitoring
METRICS_ENABLED=true
HEALTH_CHECK_ENABLED=true
```

---

## 📡 API Endpoints

### Health Checks

| Метод | Endpoint | Описание |
|-------|----------|----------|
| GET | `/api/v1/health` | Полная проверка здоровья |
| GET | `/api/v1/health/liveness` | Liveness probe (K8s) |
| GET | `/api/v1/health/readiness` | Readiness probe (K8s) |
| GET | `/api/v1/metrics` | Prometheus метрики |

### Bot Webhooks

| Метод | Endpoint | Описание |
|-------|----------|----------|
| POST | `/api/v1/bot/webhook` | Прием webhook от MAX Bot |

### Примеры запросов

**Health Check:**
```bash
curl http://localhost:3001/api/v1/health
```

**Ответ:**
```json
{
  "status": "ok",
  "info": {
    "redis": {
      "status": "up",
      "connected": true,
      "memory": "2.5MB"
    },
    "microservices": {
      "admin": "up",
      "state": "up",
      "task": "up"
    }
  }
}
```

---

## 🔌 WebSocket API

### Подключение

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3001', {
  path: '/api/v1/socket.io',
  transports: ['websocket'],
  auth: {
    token: 'your-jwt-token'
  }
});

socket.on('connect', () => {
  console.log('Connected to Gateway');
});
```

### События Client → Server

```javascript
// Аутентификация
socket.emit('authenticate', { token: 'jwt-token' });

// Подписка на события задач
socket.emit('subscribe', { channel: 'tasks' });

// Отправка сообщения
socket.emit('message', { text: 'Hello', roomId: '123' });
```

### События Server → Client

```javascript
// Уведомление о новой задаче
socket.on('task:created', (data) => {
  console.log('New task:', data);
});

// Изменение статуса задачи
socket.on('task:updated', (data) => {
  console.log('Task updated:', data);
});

// Системное уведомление
socket.on('notification', (data) => {
  console.log('Notification:', data);
});
```

---

## 🔒 Безопасность

### JWT Аутентификация

```bash
# 1. Получение токена
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "user", "password": "password"}'

# Ответ:
# {"access_token": "eyJhbGc...", "refresh_token": "eyJhbGc..."}

# 2. Использование токена
curl -H "Authorization: Bearer eyJhbGc..." \
  http://localhost:3001/api/v1/auth/profile
```

### Rate Limiting

- **100 запросов** за **60 секунд** на один IP
- При превышении: HTTP 429 Too Many Requests
- Настраивается через `THROTTLE_TTL` и `THROTTLE_LIMIT`

### CORS

Настроен для доменов:
- `https://max.app`
- `https://admin.potok.app`
- Домен из `MAX_API_BASE_URL`

---

## 📊 Мониторинг

### Prometheus метрики

Доступны на `/api/v1/metrics`:

```
# HTTP запросы
http_requests_total{method="GET",route="/api/v1/health",status="200"} 1234

# WebSocket соединения
websocket_connections_active 42
websocket_connections_total 150

# Redis операции
redis_operations_duration_seconds{operation="get"} 0.005

# Circuit Breaker
circuit_breaker_state{service="admin"} 0  # 0=closed, 1=open, 2=half-open
```

### Логирование

Структурированные JSON логи:

```json
{
  "timestamp": "2025-11-10T12:45:00.000Z",
  "level": "info",
  "context": "BotModule",
  "message": "Webhook received",
  "correlationId": "abc-123-def-456",
  "userId": "user_001",
  "event": "message.received"
}
```

---

## 🔄 Circuit Breaker

Защита от каскадных сбоев при недоступности микросервисов:

**Настройки:**
- Failure Threshold: 5 неудачных запросов
- Success Threshold: 2 успешных для восстановления
- Timeout: 60 секунд

**Состояния:**
- **Closed** (0): Нормальная работа
- **Open** (1): Сервис недоступен, запросы блокируются
- **Half-Open** (2): Пробное состояние после таймаута

---

## 🐳 Docker

### Production образ

```bash
# Сборка
docker build -t potok-gateway:latest .

# Запуск
docker run -d \
  --name potok-gateway \
  -p 3001:3001 \
  --env-file .env \
  potok-gateway:latest
```

### Docker Compose

```bash
# Development
docker-compose -f docker-compose.dev.yml up -d

# Production
docker-compose up -d

# Масштабирование
docker-compose up -d --scale gateway=3
```

---

## ☸️ Kubernetes

### Развертывание

```bash
# Применить все манифесты
kubectl apply -f k8s/

# Проверить статус
kubectl get pods -l app=potok-gateway
kubectl get svc potok-gateway

# Просмотр логов
kubectl logs -f -l app=potok-gateway

# Масштабирование
kubectl scale deployment potok-gateway --replicas=5
```

### HPA (Horizontal Pod Autoscaler)

Автоматическое масштабирование на основе:
- CPU > 70%
- Memory > 80%
- Минимум 2 пода, максимум 10

---

## 🧪 Тестирование

```bash
# Unit тесты
npm run test

# Unit тесты (watch mode)
npm run test:watch

# E2E тесты
npm run test:e2e

# Coverage
npm run test:cov
```

---

## 🔧 Разработка

### Доступные команды

```bash
# Development
npm run start:dev          # Hot-reload режим
npm run start:debug        # С отладчиком

# Build
npm run build              # Компиляция TypeScript

# Production
npm run start:prod         # Запуск production сборки

# Docker
npm run docker:build       # Сборка образа
npm run docker:up          # Запуск контейнеров
npm run docker:down        # Остановка контейнеров
npm run docker:logs        # Просмотр логов

# Code quality
npm run lint               # ESLint проверка
npm run format             # Prettier форматирование
```

---

## 🤝 Интеграция с микросервисами

Gateway взаимодействует с тремя backend сервисами:

### Admin Service (3000)
- Управление пользователями и настройками
- Централизованная БД (PostgreSQL)
- Глобальный Redis кеш

### State Management Service (3002)
- Отслеживание статусов задач
- Синхронизация состояний
- Webhook уведомления

### Task Distribution Service (3003)
- Умное распределение задач
- Оптимизация загрузки исполнителей
- Аналитика выполнения

**Все запросы маршрутизируются** через модуль `gateway/` с:
- API Key аутентификацией
- Circuit Breaker защитой
- Retry механизмом
- Request timeout (10 секунд)

---

## 🐛 Troubleshooting

### Проблема: Redis недоступен

```bash
# Проверить статус
docker ps | grep redis

# Перезапустить
docker-compose restart redis

# Проверить логи
docker-compose logs redis
```

### Проблема: Microservice не отвечает

```bash
# Проверить Circuit Breaker метрики
curl http://localhost:3001/api/v1/metrics | grep circuit_breaker

# Если state=1 (open), подождите 60 секунд для восстановления
# Или перезапустите целевой сервис
```

### Проблема: WebSocket не подключается

```bash
# 1. Проверьте CORS настройки
# 2. Убедитесь что используется правильный path: /api/v1/socket.io
# 3. Проверьте JWT токен
# 4. Посмотрите логи:
docker-compose logs gateway | grep WebSocket
```

---

## 📚 Документация

- [API Documentation](http://localhost:3001/api/docs) - Swagger UI
- [NestJS Documentation](https://docs.nestjs.com)
- [Socket.IO Documentation](https://socket.io/docs/)
- [MAX Bot API](https://developer.max.app)

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
