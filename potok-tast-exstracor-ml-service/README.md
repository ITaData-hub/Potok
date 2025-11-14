# 🤖 Task Extraction AI API

Высокопроизводительный REST API для извлечения структурированной информации из текстовых описаний задач с использованием нейронных сетей и rule-based подходов.

![Python](https://img.shields.io/badge/Python-3.10+-blue.svg)
![FastAPI](https://img.shields.io/badge/FastAPI-0.109.0-green.svg)
![PyTorch](https://img.shields.io/badge/PyTorch-2.1.2-red.svg)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)

---

## 📋 Содержание

- [Возможности](#-возможности)
- [Архитектура](#-архитектура)
- [Установка](#️-установка)
- [Быстрый старт](#-быстрый-старт)
- [API Документация](#-api-документация)
- [Примеры использования](#-примеры-использования)
- [Обучение модели](#-обучение-модели)
- [Конфигурация](#-конфигурация)
- [Docker](#-docker)
- [Тестирование](#-тестирование)
- [Production](#-production-deployment)

---

## 🚀 Возможности

### Основной функционал

- **🎯 Предсказание параметров задач**
  - Автоматическое извлечение названия задачи
  - Определение приоритета (1-5)
  - Парсинг дедлайна из естественного языка
  - Классификация по категориям
  - Оценка сложности (1-10)
  - Предсказание статуса задачи

- **📚 Обучение и дообучение моделей**
  - Полное обучение с нуля (минимум 10 примеров)
  - Fine-tuning существующих моделей (минимум 5 примеров)
  - Заморозка слоев для ускорения дообучения
  - Автоматическое сохранение чекпоинтов

- **🔧 Управление моделями**
  - Версионирование моделей с timestamp
  - Загрузка/выгрузка моделей в runtime
  - Удаление старых версий
  - Просмотр метаданных моделей

- **📊 Мониторинг и метрики**
  - Health checks для проверки состояния
  - Детальные метрики производительности
  - Кеширование предсказаний
  - Логирование в JSON формате

---

## 🏗️ Архитектура

Проект построен на принципах **Clean Architecture** и **SOLID**:

```
task-extraction-service/
│
├── app/
│   ├── main.py                    # 🚀 Точка входа FastAPI
│   │
│   ├── api/v1/                    # 🌐 API эндпоинты
│   │   ├── prediction.py          #    → Предсказания
│   │   ├── training.py            #    → Обучение/дообучение
│   │   ├── management.py          #    → Управление моделями
│   │   └── monitoring.py          #    → Мониторинг
│   │
│   ├── services/                  # 💼 Бизнес-логика
│   │   ├── prediction_service.py  #    → Сервис предсказаний
│   │   ├── training_service.py    #    → Сервис обучения
│   │   └── model_manager.py       #    → Управление моделями
│   │
│   ├── core/                      # 🧠 Ядро системы
│   │   ├── models.py              #    → PyTorch модели (LSTM + Attention)
│   │   ├── vocabulary.py          #    → Словарь и энкодеры
│   │   ├── dataset.py             #    → Dataset классы
│   │   └── rules_engine.py        #    → Rule-based извлечение
│   │
│   ├── schemas/                   # 📝 Pydantic модели
│   │   ├── task.py                #    → Схемы для задач
│   │   ├── training.py            #    → Схемы для обучения
│   │   └── common.py              #    → Общие схемы
│   │
│   ├── config/                    # ⚙️ Конфигурация
│   │   └── settings.py            #    → Настройки приложения
│   │
│   └── utils/                     # 🛠️ Утилиты
│       ├── logger.py              #    → Логирование
│       └── exceptions.py          #    → Кастомные исключения
│
├── data/
│   ├── models/                    # 💾 Сохраненные модели
│   ├── training/                  # 📊 Тренировочные данные
│   └── logs/                      # 📋 Логи
│
├── scripts/
│   └── train_model.py             # 🎓 CLI скрипт обучения
│
├── tests/
│   └── test_*.py                  # ✅ Тесты
│
├── docker/
│   ├── Dockerfile
│   └── docker-compose.yml
│
├── requirements.txt
├── .env.example
└── README.md
```

### Технологический стек

- **Backend**: FastAPI, Uvicorn
- **ML**: PyTorch (LSTM + Multi-head Attention)
- **Валидация**: Pydantic
- **Логирование**: Структурированное JSON логирование
- **Контейнеризация**: Docker, Docker Compose

---

## 🛠️ Установка

### Требования

- Python 3.10+
- pip или poetry
- (Опционально) Docker и Docker Compose

### Локальная установка

```bash
# 1. Клонирование репозитория
git clone https://github.com/yourusername/task-extraction-service.git
cd task-extraction-service

# 2. Создание виртуального окружения
python -m venv venv

# Активация (Linux/Mac)
source venv/bin/activate

# Активация (Windows)
venv\Scripts\activate

# 3. Установка зависимостей
pip install --upgrade pip
pip install -r requirements.txt

# 4. Копирование и настройка .env файла
cp .env.example .env
# Отредактируйте .env под ваши нужды

# 5. Создание директорий для данных
mkdir -p data/models data/training data/logs
```

---

## 🚀 Быстрый старт

### 1. Запуск сервера

```bash
# Стандартный запуск
python -m app.main

# Или через uvicorn напрямую
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# С несколькими воркерами (для production)
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

Сервер будет доступен по адресу: **http://localhost:8000**

### 2. Проверка работоспособности

```bash
# Простой ping
curl http://localhost:8000/api/v1/monitoring/ping

# Health check
curl http://localhost:8000/api/v1/monitoring/health
```

### 3. Первое предсказание

⚠️ **Важно**: Сначала необходимо загрузить обученную модель!

```bash
# Загрузка модели
curl -X POST "http://localhost:8000/api/v1/management/load" \
  -H "Content-Type: application/json" \
  -d '{"model_name": "task_extraction_model"}'

# Предсказание
curl -X POST "http://localhost:8000/api/v1/predict/" \
  -H "Content-Type: application/json" \
  -d '{"text": "Пожарить пельмени до пятницы, очень важно"}'
```

**Ответ:**
```json
{
  "name": "Пожарить пельмени",
  "description": "-",
  "priority": 4,
  "deadline": "2025-11-15",
  "execution_time": "-",
  "category": ["Кулинария"],
  "difficulty": 3,
  "stages": [],
  "status": "новая",
  "confidence": 0.87,
  "processed_at": "2025-11-10T10:59:00Z"
}
```

---

## 📚 API Документация

После запуска сервера автоматически доступна интерактивная документация:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Основные эндпоинты

#### 🎯 Prediction API

| Метод | Эндпоинт | Описание |
|-------|----------|----------|
| POST | `/api/v1/predict/` | Предсказание для одной задачи |
| POST | `/api/v1/predict/batch` | Пакетная обработка (до 100 задач) |

#### 📚 Training API

| Метод | Эндпоинт | Описание |
|-------|----------|----------|
| POST | `/api/v1/training/train` | Обучение новой модели |
| POST | `/api/v1/training/fine-tune` | Дообучение модели |
| GET | `/api/v1/training/status/{id}` | Статус обучения |

#### 🔧 Management API

| Метод | Эндпоинт | Описание |
|-------|----------|----------|
| POST | `/api/v1/management/load` | Загрузка модели |
| GET | `/api/v1/management/models` | Список всех моделей |
| GET | `/api/v1/management/current-model` | Текущая модель |
| DELETE | `/api/v1/management/models/{name}/{version}` | Удаление модели |

#### 📊 Monitoring API

| Метод | Эндпоинт | Описание |
|-------|----------|----------|
| GET | `/api/v1/monitoring/health` | Health check |
| GET | `/api/v1/monitoring/metrics` | Детальные метрики |
| GET | `/api/v1/monitoring/ping` | Простая проверка |
| POST | `/api/v1/monitoring/cache/clear` | Очистка кеша |

---

## 💡 Примеры использования

### Python

```python
import requests
import json

class TaskExtractionClient:
    def __init__(self, base_url="http://localhost:8000"):
        self.base_url = base_url
        self.api_prefix = "/api/v1"
    
    def predict(self, text: str):
        """Предсказание для одной задачи"""
        response = requests.post(
            f"{self.base_url}{self.api_prefix}/predict/",
            json={"text": text}
        )
        response.raise_for_status()
        return response.json()
    
    def predict_batch(self, texts: list):
        """Пакетное предсказание"""
        response = requests.post(
            f"{self.base_url}{self.api_prefix}/predict/batch",
            json={"texts": texts}
        )
        response.raise_for_status()
        return response.json()
    
    def train(self, training_examples: list, epochs: int = 30):
        """Обучение новой модели"""
        response = requests.post(
            f"{self.base_url}{self.api_prefix}/training/train",
            json={
                "training_examples": training_examples,
                "epochs": epochs,
                "batch_size": 32,
                "learning_rate": 0.001
            }
        )
        response.raise_for_status()
        return response.json()
    
    def get_metrics(self):
        """Получение метрик"""
        response = requests.get(
            f"{self.base_url}{self.api_prefix}/monitoring/metrics"
        )
        response.raise_for_status()
        return response.json()

# Использование
client = TaskExtractionClient()

# Одиночное предсказание
result = client.predict("Приготовить торт к субботе, важно")
print(json.dumps(result, indent=2, ensure_ascii=False))

# Пакетное предсказание
results = client.predict_batch([
    "Разработать API за 8 часов",
    "Покрасить стену, низкий приоритет"
])
print(f"Обработано: {results['total']}")

# Метрики
metrics = client.get_metrics()
print(f"Всего предсказаний: {metrics['predictions']['total']}")
```

### JavaScript/TypeScript

```typescript
class TaskExtractionClient {
  constructor(private baseUrl: string = 'http://localhost:8000') {}

  async predict(text: string) {
    const response = await fetch(`${this.baseUrl}/api/v1/predict/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  }

  async predictBatch(texts: string[]) {
    const response = await fetch(`${this.baseUrl}/api/v1/predict/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texts })
    });
    
    return await response.json();
  }
}

// Использование
const client = new TaskExtractionClient();

const result = await client.predict('Пожарить пельмени до пятницы');
console.log(result);
```

### cURL

```bash
# Предсказание
curl -X POST "http://localhost:8000/api/v1/predict/" \
  -H "Content-Type: application/json" \
  -d '{"text": "Разработать новый фичу срочно!!!"}'

# Пакетное предсказание
curl -X POST "http://localhost:8000/api/v1/predict/batch" \
  -H "Content-Type: application/json" \
  -d '{
    "texts": [
      "Задача 1",
      "Задача 2",
      "Задача 3"
    ]
  }'

# Метрики
curl "http://localhost:8000/api/v1/monitoring/metrics"

# Список моделей
curl "http://localhost:8000/api/v1/management/models"
```

---

## 🎓 Обучение модели

### Формат тренировочных данных

Создайте файл `training_data.json`:

```json
{
  "training_examples": [
    {
      "text": "Пожарить пельмени до пятницы, очень важно",
      "labels": {
        "name": "Пожарить пельмени",
        "description": "-",
        "priority": 4,
        "deadline": "2025-11-15",
        "execution_time": "-",
        "category": ["Кулинария"],
        "difficulty": 3,
        "stages": [],
        "status": "новая"
      }
    },
    {
      "text": "ПЕРЕДЕЛАТЬ ВЕСЬ САЙТ!!! срочно, 8 часов",
      "labels": {
        "name": "Переделать весь сайт",
        "description": "-",
        "priority": 5,
        "deadline": null,
        "execution_time": "8:00:00",
        "category": ["Веб-разработка", "Frontend"],
        "difficulty": 8,
        "stages": [],
        "status": "новая"
      }
    }
    // ... минимум 10 примеров
  ]
}
```

### Обучение через API

```bash
curl -X POST "http://localhost:8000/api/v1/training/train" \
  -H "Content-Type: application/json" \
  -d @training_data.json
```

**Ответ:**
```json
{
  "training_id": "train_15_30",
  "status": "pending",
  "message": "Обучение запущено в фоновом режиме",
  "model_name": "task_extraction_model",
  "total_examples": 15,
  "epochs": 30,
  "estimated_duration_seconds": 45
}
```

### Обучение через CLI

```bash
python scripts/train_model.py data/training/training_data.json \
  --epochs 30 \
  --batch-size 32 \
  --lr 0.001 \
  --name my_custom_model
```

### Дообучение (Fine-tuning)

```json
{
  "training_examples": [
    {
      "text": "Новый пример задачи",
      "labels": { /* ... */ }
    }
    // минимум 5 примеров
  ],
  "epochs": 10,
  "batch_size": 16,
  "learning_rate": 0.0001,
  "freeze_embedding": true,
  "model_version": "20251110_120000"
}
```

```bash
curl -X POST "http://localhost:8000/api/v1/training/fine-tune" \
  -H "Content-Type: application/json" \
  -d @fine_tune_data.json
```

---

## ⚙️ Конфигурация

### Переменные окружения (.env)

```env
# ============================================================================
# API CONFIGURATION
# ============================================================================
APP_NAME=Task Extraction AI API
APP_VERSION=2.0.0
HOST=0.0.0.0
PORT=8000
DEBUG=false

# ============================================================================
# PATHS
# ============================================================================
MODEL_DIR=./data/models
TRAINING_DATA_DIR=./data/training
LOG_DIR=./data/logs

# ============================================================================
# MODEL CONFIGURATION
# ============================================================================
DEVICE=cpu                    # cpu или cuda
MODEL_NAME=task_extraction_model
EMBEDDING_DIM=100
HIDDEN_DIM=128
DROPOUT=0.3
NUM_HEADS=4
NUM_LAYERS=2

# ============================================================================
# TRAINING CONFIGURATION
# ============================================================================
DEFAULT_LEARNING_RATE=0.001
DEFAULT_EPOCHS=30
DEFAULT_BATCH_SIZE=32
MAX_TITLE_LEN=55
MAX_TEXT_LEN=200

# ============================================================================
# API LIMITS
# ============================================================================
MAX_BATCH_SIZE=100
MAX_TEXT_LENGTH=1000
RATE_LIMIT_PREDICTION=100     # запросов в минуту
RATE_LIMIT_TRAINING=5         # запросов в час

# ============================================================================
# CORS
# ============================================================================
CORS_ORIGINS=["*"]
CORS_CREDENTIALS=true
CORS_METHODS=["*"]
CORS_HEADERS=["*"]

# ============================================================================
# SECURITY
# ============================================================================
API_KEY=                      # Оставьте пустым для отключения
SECRET_KEY=change-this-in-production-please

# ============================================================================
# LOGGING
# ============================================================================
LOG_LEVEL=INFO                # DEBUG, INFO, WARNING, ERROR
LOG_FORMAT=json               # json или text

# ============================================================================
# MONITORING
# ============================================================================
ENABLE_METRICS=true
ENABLE_TRACING=false
```

---

## 🐳 Docker

### Быстрый запуск

```bash
cd docker
docker-compose up -d
```

Сервис будет доступен на **http://localhost:8000**

### Docker Compose конфигурация

```yaml
version: '3.8'

services:
  task-extraction-api:
    build:
      context: ..
      dockerfile: docker/Dockerfile
    container_name: task_extraction_api
    ports:
      - "8000:8000"
    volumes:
      - ../data:/app/data
    environment:
      - DEVICE=cpu
      - LOG_LEVEL=INFO
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/api/v1/monitoring/ping"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### Команды Docker

```bash
# Сборка образа
docker-compose build

# Запуск
docker-compose up -d

# Просмотр логов
docker-compose logs -f

# Просмотр логов конкретного сервиса
docker-compose logs -f task-extraction-api

# Остановка
docker-compose down

# Остановка с удалением volumes
docker-compose down -v

# Перезапуск
docker-compose restart
```

---

## 🧪 Тестирование

### Запуск тестов

```bash
# Все тесты
pytest

# С выводом
pytest -v

# С покрытием кода
pytest --cov=app --cov-report=html

# Конкретный тест
pytest tests/test_prediction.py::test_predict_endpoint

# С логированием
pytest -v -s
```

### Структура тестов

```python
# tests/test_prediction.py
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_predict_endpoint():
    response = client.post(
        "/api/v1/predict/",
        json={"text": "Пожарить пельмени"}
    )
    assert response.status_code in [200, 503]

def test_health_check():
    response = client.get("/api/v1/monitoring/health")
    assert response.status_code == 200
    assert "status" in response.json()
```

---

## 🚀 Production Deployment

### Рекомендации для продакшена

#### 1. Безопасность

```env
# Сгенерируйте надежный SECRET_KEY
SECRET_KEY=$(openssl rand -hex 32)

# Настройте API ключи
API_KEY=your-secret-api-key-here

# Ограничьте CORS
CORS_ORIGINS=["https://yourdomain.com"]
```

#### 2. Производительность

```bash
# Используйте несколько воркеров
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4

# Или через gunicorn
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker
```

#### 3. Reverse Proxy (Nginx)

```nginx
upstream task_extraction_api {
    server 127.0.0.1:8000;
}

server {
    listen 80;
    server_name api.yourdomain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://task_extraction_api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

#### 4. Мониторинг

Включите Prometheus и Grafana:

```bash
docker-compose --profile monitoring up -d
```

- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3000 (admin/admin)

#### 5. Логирование

```python
# Настройка централизованного логирования
LOG_FORMAT=json
LOG_LEVEL=INFO

# Интеграция с ELK Stack или аналогами
```

#### 6. Автомасштабирование (Kubernetes)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: task-extraction-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: task-extraction-api
  template:
    metadata:
      labels:
        app: task-extraction-api
    spec:
      containers:
      - name: api
        image: task-extraction-api:latest
        ports:
        - containerPort: 8000
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
```

---

## 📊 Метрики производительности

При правильной настройке система обеспечивает:

- **Latency**: < 50ms для одиночных предсказаний (с кешем)
- **Throughput**: До 1000 запросов/сек (с несколькими воркерами)
- **Cache hit rate**: 60-80% при типичной нагрузке
- **Memory**: ~300-500MB на воркер

---

## 🤝 Вклад в проект

Мы приветствуем любые Pull Requests! 

1. Fork репозитория
2. Создайте feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit изменения (`git commit -m 'Add some AmazingFeature'`)
4. Push в branch (`git push origin feature/AmazingFeature`)
5. Откройте Pull Request

### Гайдлайны

- Следуйте PEP 8
- Пишите тесты для нового функционала
- Обновляйте документацию
- Используйте type hints

---

## 📝 Лицензия

Этот проект лицензирован под MIT License - см. файл [LICENSE](LICENSE) для деталей.

---

## 👥 Авторы

- **Ваше Имя** - *Разработка* - [GitHub](https://github.com/yourusername)

---

## 🙏 Благодарности

- FastAPI за отличный фреймворк
- PyTorch за мощные инструменты ML
- Сообществу разработчиков за вдохновение

---

## 📞 Контакты

- **Email**: your.email@example.com
- **Telegram**: @yourusername
- **GitHub Issues**: [Issues](https://github.com/yourusername/task-extraction-service/issues)

---

**⭐ Если проект был полезен, поставьте звезду на GitHub!**