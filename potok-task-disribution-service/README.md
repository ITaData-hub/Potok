# 🎯 Potok Task Distribution Service

**Умное распределение задач и оптимизация эффективности команды**

Интеллектуальный микросервис для автоматического распределения задач между исполнителями на основе загрузки, компетенций и приоритетов в системе Potok.

[![NestJS](https://img.shields.io/badge/NestJS-11.x-red?logo=nestjs)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20-green?logo=node.js)](https://nodejs.org/)

---

## 📋 Содержание

- [О проекте](#-о-проекте)
- [Возможности](#-возможности)
- [Архитектура](#-архитектура)
- [Алгоритмы распределения](#-алгоритмы-распределения)
- [Технологический стек](#-технологический-стек)
- [Быстрый старт](#-быстрый-старт)
- [Конфигурация](#-конфигурация)
- [API Документация](#-api-документация)
- [Модули системы](#-модули-системы)
- [Интеграция с сервисами](#-интеграция-с-сервисами)
- [Аналитика](#-аналитика)
- [Мониторинг](#-мониторинг)

---

## 🎯 О проекте

Task Distribution Service — это **мозг системы распределения задач** в экосистеме Potok. Сервис использует интеллектуальные алгоритмы для:

- Автоматического назначения задач оптимальным исполнителям
- Балансировки загрузки команды
- Учета приоритетов и дедлайнов
- Анализа эффективности распределения
- Оптимизации производительности команды

**Ключевые метрики:**
- Время назначения задачи: < 100ms
- Точность распределения: > 90%
- Балансировка загрузки: ±15%

**Версия:** 1.0.0  
**Порт по умолчанию:** 3003  
**Ветка разработки:** dev

---

## ✨ Возможности

### 🤖 Умное распределение

- **Автоматическое назначение** - алгоритмы распределения
  - Round Robin - равномерное распределение
  - Least Loaded - назначение наименее загруженному
  - Skill-based - учет компетенций
  - Priority-based - учет приоритетов
  - Hybrid - комбинированный подход
- **Балансировка загрузки** - равномерная нагрузка
  - Отслеживание текущей загрузки
  - Предотвращение перегрузки
  - Динамическое перераспределение
- **Учет контекста** - многофакторный анализ
  - Навыки и опыт исполнителя
  - Текущая загрузка
  - Приоритет задачи
  - Дедлайны
  - История выполнения

### 📊 Аналитика эффективности

- **Performance tracking** - отслеживание показателей
  - Время выполнения задач
  - Качество выполнения
  - Соблюдение дедлайнов
  - Процент успешных завершений
- **Team analytics** - аналитика команды
  - Загрузка каждого участника
  - Сравнительный анализ
  - Тренды производительности
- **Optimization suggestions** - рекомендации
  - Перераспределение задач
  - Оптимизация процессов
  - Улучшение эффективности

### 🎲 Алгоритмы

- **Round Robin** - последовательное назначение
- **Least Loaded** - минимальная загрузка
- **Weighted Round Robin** - с учетом весов
- **Skill Matching** - по компетенциям
- **Priority Queue** - очередь с приоритетами
- **Machine Learning** (roadmap) - предиктивное распределение

### 📈 Прогнозирование

- **Capacity planning** - планирование мощностей
  - Прогноз загрузки
  - Определение bottlenecks
  - Рекомендации по масштабированию
- **Deadline prediction** - прогноз сроков
  - Оценка времени выполнения
  - Предупреждение о рисках
  - Автоматическая корректировка

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
┌────────────────────────────────────────┐
│ Task Distribution Service (Port 3003)  │
│  ┌──────────────────────────────────┐  │
│  │ Distribution Engine              │  │
│  │ ├─ Algorithm selector            │  │
│  │ ├─ Task analyzer                 │  │
│  │ ├─ Executor matcher              │  │
│  │ └─ Assignment executor           │  │
│  └──────────────────────────────────┘  │
│  ┌──────────────────────────────────┐  │
│  │ Load Balancer                    │  │
│  │ ├─ Workload tracker              │  │
│  │ ├─ Capacity monitor              │  │
│  │ ├─ Overload detector             │  │
│  │ └─ Rebalancing engine            │  │
│  └──────────────────────────────────┘  │
│  ┌──────────────────────────────────┐  │
│  │ Analytics Engine                 │  │
│  │ ├─ Performance metrics           │  │
│  │ ├─ Efficiency calculator         │  │
│  │ ├─ Trend analyzer                │  │
│  │ └─ Report generator              │  │
│  └──────────────────────────────────┘  │
│  ┌──────────────────────────────────┐  │
│  │ Prediction Module                │  │
│  │ ├─ Capacity forecaster           │  │
│  │ ├─ Deadline predictor            │  │
│  │ └─ Risk assessor                 │  │
│  └──────────────────────────────────┘  │
└────────┬──────────────┬────────────────┘
         │              │
         ▼              ▼
  ┌──────────┐   ┌──────────┐
  │  State   │   │  Admin   │
  │Management│   │ Service  │
  │ Service  │   │          │
  └──────────┘   └──────────┘
```

### Структура модулей

```
src/
├── modules/
│   ├── distribution/          # Distribution engine
│   │   ├── distribution.module.ts
│   │   ├── distribution.controller.ts
│   │   ├── distribution.service.ts
│   │   ├── algorithms/
│   │   │   ├── round-robin.strategy.ts
│   │   │   ├── least-loaded.strategy.ts
│   │   │   ├── skill-based.strategy.ts
│   │   │   └── hybrid.strategy.ts
│   │   └── dto/
│   │       ├── distribute-task.dto.ts
│   │       └── assignment-result.dto.ts
│   │
│   ├── tasks/                 # Task management
│   │   ├── tasks.module.ts
│   │   ├── tasks.controller.ts
│   │   ├── tasks.service.ts
│   │   └── dto/
│   │       ├── create-task.dto.ts
│   │       └── update-task.dto.ts
│   │
│   ├── executors/             # Executor management
│   │   ├── executors.module.ts
│   │   ├── executors.controller.ts
│   │   ├── executors.service.ts
│   │   └── dto/
│   │       ├── executor-profile.dto.ts
│   │       └── workload.dto.ts
│   │
│   ├── analytics/             # Analytics & reporting
│   │   ├── analytics.module.ts
│   │   ├── analytics.controller.ts
│   │   ├── analytics.service.ts
│   │   └── dto/
│   │       ├── performance-metrics.dto.ts
│   │       └── team-analytics.dto.ts
│   │
│   ├── prediction/            # Forecasting
│   │   ├── prediction.module.ts
│   │   ├── prediction.service.ts
│   │   └── models/
│   │       ├── capacity-model.ts
│   │       └── deadline-model.ts
│   │
│   └── health/                # Health checks
│       ├── health.module.ts
│       └── health.controller.ts
│
├── common/
│   ├── decorators/
│   ├── filters/
│   ├── interceptors/
│   └── pipes/
│
├── config/
│   ├── app.config.ts
│   ├── distribution.config.ts
│   └── analytics.config.ts
│
├── app.module.ts
└── main.ts
```

---

## 🤖 Алгоритмы распределения

### Round Robin

Последовательное распределение задач по кругу:

```typescript
// Псевдокод
let currentIndex = 0;
const executors = getAvailableExecutors();

function assignTask(task: Task): Executor {
  const executor = executors[currentIndex];
  currentIndex = (currentIndex + 1) % executors.length;
  return executor;
}
```

**Плюсы:**
- Простота реализации
- Равномерное распределение
- Предсказуемость

**Минусы:**
- Не учитывает загрузку
- Игнорирует компетенции
- Нет приоритезации

### Least Loaded

Назначение наименее загруженному исполнителю:

```typescript
function assignTask(task: Task): Executor {
  const executors = getAvailableExecutors();
  
  // Сортировка по загрузке
  executors.sort((a, b) => a.currentLoad - b.currentLoad);
  
  // Назначение первому (наименее загруженному)
  return executors[0];
}
```

**Плюсы:**
- Балансировка загрузки
- Предотвращение перегрузки
- Оптимальное использование ресурсов

**Минусы:**
- Не учитывает навыки
- Игнорирует сложность задач

### Skill-based

Учет компетенций и опыта:

```typescript
function assignTask(task: Task): Executor {
  const requiredSkills = task.requiredSkills;
  const executors = getAvailableExecutors();
  
  // Оценка соответствия
  const scored = executors.map(executor => ({
    executor,
    score: calculateSkillMatch(executor.skills, requiredSkills)
  }));
  
  // Сортировка по score
  scored.sort((a, b) => b.score - a.score);
  
  return scored[0].executor;
}
```

**Плюсы:**
- Учет компетенций
- Качественное выполнение
- Развитие навыков

**Минусы:**
- Возможна перегрузка экспертов
- Сложность расчета

### Hybrid (рекомендуемый)

Комбинированный подход:

```typescript
function assignTask(task: Task): Executor {
  const executors = getAvailableExecutors();
  
  // Многофакторная оценка
  const scored = executors.map(executor => {
    const skillScore = calculateSkillMatch(
      executor.skills,
      task.requiredSkills
    );
    const loadScore = 1 - (executor.currentLoad / executor.capacity);
    const priorityBonus = task.priority === 'high' ? 0.2 : 0;
    
    // Взвешенная сумма
    return {
      executor,
      score: (
        skillScore * 0.4 +
        loadScore * 0.4 +
        priorityBonus * 0.2
      )
    };
  });
  
  scored.sort((a, b) => b.score - a.score);
  return scored[0].executor;
}
```

**Плюсы:**
- Балансировка всех факторов
- Гибкость настройки весов
- Оптимальные результаты

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
| `axios` | 1.13.1 | HTTP запросы |
| `date-fns` | 4.1.0 | Работа с датами |
| `uuid` | 13.0.0 | Генерация ID |
| `winston` | 3.18.3 | Логирование |
| `compression` | 1.8.1 | GZIP сжатие |
| `helmet` | 8.1.0 | Безопасность |

---

## 🚀 Быстрый старт

### Требования

- Node.js ≥ 20.x
- npm ≥ 10.x
- Docker ≥ 24.x (опционально)
- Доступ к Admin Service и State Management Service

### Установка

```bash
# Клонирование
git clone https://github.com/ITaData-hub/potok-task-disribution-service.git
cd potok-task-disribution-service

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
PORT=3003
APP_NAME=potok-task-distribution-service

# Logging
LOG_LEVEL=debug
LOG_FORMAT=pretty

# Distribution Algorithm
DEFAULT_ALGORITHM=hybrid
SKILL_WEIGHT=0.4
LOAD_WEIGHT=0.4
PRIORITY_WEIGHT=0.2

# External Services
ADMIN_SERVICE_URL=http://localhost:3000
ADMIN_API_KEY=task-service-key
STATE_SERVICE_URL=http://localhost:3002

# Performance
MAX_CONCURRENT_DISTRIBUTIONS=10
DISTRIBUTION_TIMEOUT=5000
CACHE_TTL=300
```

### Запуск

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
curl http://localhost:3003/health

# Swagger docs
open http://localhost:3003/api-docs
```

---

## ⚙️ Конфигурация

### Переменные окружения

#### Application

```env
NODE_ENV=development
PORT=3003
APP_NAME=potok-task-distribution-service
```

#### Distribution Algorithm

```env
# Алгоритм по умолчанию: round_robin, least_loaded, skill_based, hybrid
DEFAULT_ALGORITHM=hybrid

# Веса для hybrid алгоритма (сумма должна быть 1.0)
SKILL_WEIGHT=0.4
LOAD_WEIGHT=0.4
PRIORITY_WEIGHT=0.2

# Пороги
MAX_EXECUTOR_LOAD=10
MIN_SKILL_MATCH=0.5
```

#### External Services

```env
ADMIN_SERVICE_URL=http://localhost:3000
ADMIN_API_KEY=task-service-key
STATE_SERVICE_URL=http://localhost:3002
```

#### Performance

```env
MAX_CONCURRENT_DISTRIBUTIONS=10
DISTRIBUTION_TIMEOUT=5000
CACHE_TTL=300
RETRY_ATTEMPTS=3
RETRY_DELAY=1000
```

#### Analytics

```env
ANALYTICS_ENABLED=true
METRICS_INTERVAL=60000
REPORT_GENERATION_ENABLED=true
```

---

## 📚 API Документация

### Swagger UI

```
http://localhost:3003/api-docs
```

### Tasks API

| Метод | Endpoint | Описание |
|-------|----------|---------|
| POST | `/api/v1/tasks` | Создать задачу |
| GET | `/api/v1/tasks` | Получить все задачи |
| GET | `/api/v1/tasks/:id` | Получить задачу по ID |
| PUT | `/api/v1/tasks/:id` | Обновить задачу |
| DELETE | `/api/v1/tasks/:id` | Удалить задачу |

### Distribution API

| Метод | Endpoint | Описание |
|-------|----------|---------|
| POST | `/api/v1/distribution/assign` | Назначить задачу |
| POST | `/api/v1/distribution/reassign` | Переназначить задачу |
| GET | `/api/v1/distribution/suggestions` | Получить рекомендации |
| POST | `/api/v1/distribution/balance` | Перебалансировать загрузку |

### Executors API

| Метод | Endpoint | Описание |
|-------|----------|---------|
| GET | `/api/v1/executors` | Получить всех исполнителей |
| GET | `/api/v1/executors/:id` | Получить исполнителя |
| GET | `/api/v1/executors/:id/workload` | Текущая загрузка |
| GET | `/api/v1/executors/:id/performance` | Показатели эффективности |

### Analytics API

| Метод | Endpoint | Описание |
|-------|----------|---------|
| GET | `/api/v1/analytics/team` | Аналитика команды |
| GET | `/api/v1/analytics/executor/:id` | Аналитика исполнителя |
| GET | `/api/v1/analytics/tasks` | Аналитика задач |
| GET | `/api/v1/analytics/efficiency` | Метрики эффективности |

### Prediction API

| Метод | Endpoint | Описание |
|-------|----------|---------|
| POST | `/api/v1/prediction/deadline` | Прогноз дедлайна |
| GET | `/api/v1/prediction/capacity` | Прогноз мощности |
| GET | `/api/v1/prediction/risks` | Оценка рисков |

### Примеры

#### Создание и назначение задачи

```bash
curl -X POST http://localhost:3003/api/v1/distribution/assign \
  -H "Content-Type: application/json" \
  -H "x-api-key: gateway-service-key" \
  -d '{
    "title": "Реализовать новую фичу",
    "description": "Добавить функционал экспорта данных",
    "priority": "high",
    "estimatedHours": 8,
    "requiredSkills": ["typescript", "nestjs", "postgresql"],
    "deadline": "2025-11-15T23:59:59Z",
    "algorithm": "hybrid"
  }'
```

**Ответ:**

```json
{
  "taskId": "task_123",
  "assignedTo": {
    "executorId": "user_789",
    "name": "Иван Иванов",
    "currentLoad": 6
  },
  "algorithm": "hybrid",
  "matchScore": 0.87,
  "estimatedCompletionDate": "2025-11-14T18:00:00Z",
  "confidence": 0.92
}
```

#### Получение аналитики команды

```bash
curl http://localhost:3003/api/v1/analytics/team?period=week \
  -H "x-api-key: gateway-service-key"
```

**Ответ:**

```json
{
  "period": "week",
  "startDate": "2025-11-04",
  "endDate": "2025-11-10",
  "metrics": {
    "totalTasks": 47,
    "completedTasks": 42,
    "completionRate": 0.89,
    "averageCompletionTime": "6.2 hours",
    "onTimeDelivery": 0.95
  },
  "executors": [
    {
      "id": "user_789",
      "name": "Иван Иванов",
      "completedTasks": 12,
      "averageTime": "5.8 hours",
      "currentLoad": 6
    }
  ],
  "bottlenecks": [],
  "recommendations": [
    "Рассмотреть перераспределение задач от user_456"
  ]
}
```

---

## 🔗 Интеграция с сервисами

### Admin Service

Получение данных об исполнителях и задачах:

```typescript
// Получение профиля исполнителя
const executor = await this.adminService.getExecutor(executorId);

// Получение списка активных задач
const tasks = await this.adminService.getTasks({
  status: 'active',
  assignedTo: executorId
});
```

### State Management Service

Обновление статусов задач:

```typescript
// При назначении задачи
await this.stateService.updateState('task', taskId, {
  status: 'assigned',
  assignedTo: executorId,
  assignedAt: new Date()
});

// При завершении
await this.stateService.updateState('task', taskId, {
  status: 'completed',
  completedAt: new Date()
});
```

---

## 📊 Аналитика

### Метрики производительности

- **Task Completion Rate** - процент завершенных задач
- **Average Completion Time** - среднее время выполнения
- **On-Time Delivery** - процент задач в срок
- **Executor Efficiency** - эффективность каждого исполнителя
- **Load Distribution** - распределение нагрузки

### Отчеты

- **Daily Report** - ежедневный отчет
- **Weekly Report** - еженедельный отчет
- **Monthly Report** - месячный отчет
- **Custom Report** - кастомный период

---

## 📊 Мониторинг

### Health Checks

```bash
# Liveness
curl http://localhost:3003/health/liveness

# Readiness
curl http://localhost:3003/health/readiness

# Full health
curl http://localhost:3003/health
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
docker-compose logs -f task-service

# Остановка
docker-compose down
```

---

## 📞 Поддержка

- **Email:** itadata602@gmail.com
- **GitHub:** [@ITaData-hub](https://github.com/ITaData-hub)
- **Repository:** [potok-task-disribution-service](https://github.com/ITaData-hub/potok-task-disribution-service)

---

## 📄 Лицензия

**UNLICENSED** - частный проект

---

**Последнее обновление:** 10 ноября 2025  
**Версия:** 1.0.0  
**Ветка:** dev
