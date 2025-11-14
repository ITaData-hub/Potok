from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import time
from pathlib import Path

from app.config.settings import get_settings
from app.utils.logger import setup_logger
from app.api.v1 import prediction, training, management, monitoring
from app.services.prediction_service import PredictionService

settings = get_settings()
logger = setup_logger("main", settings.LOG_LEVEL, Path(settings.LOG_DIR))

# Глобальный сервис предсказаний
prediction_service = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle events для приложения"""
    # Startup
    logger.info("🚀 Запуск сервиса Task Extraction AI...")
    
    global prediction_service
    from app.api.v1.prediction import prediction_service as ps
    prediction_service = ps
    
    # Попытка загрузить модель по умолчанию
    try:
        prediction_service.load_model()
        logger.info("✅ Модель по умолчанию загружена")
    except Exception as e:
        logger.warning(f"⚠️ Не удалось загрузить модель по умолчанию: {e}")
        logger.info("💡 Загрузите модель через /api/v1/management/load")
    
    yield
    
    # Shutdown
    logger.info("🛑 Остановка сервиса...")

# Создание приложения
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="""
    ## 🤖 Task Extraction AI API
    
    Сервис для извлечения структурированной информации из текстовых описаний задач 
    с использованием нейронных сетей и rule-based подходов.
    
    ### Основные возможности:
    
    * **Prediction API** - предсказание параметров задач
    * **Training API** - обучение и дообучение моделей
    * **Management API** - управление моделями
    * **Monitoring API** - мониторинг и метрики
    
    ### Примеры использования:
    
    ```
    import requests
    
    # Предсказание
    response = requests.post(
        "http://localhost:3004/api/v1/predict/",
        json={"text": "Пожарить пельмени до пятницы, очень важно"}
    )
    print(response.json())
    ```
    """,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=settings.CORS_CREDENTIALS,
    allow_methods=settings.CORS_METHODS,
    allow_headers=settings.CORS_HEADERS,
)

# Request timing middleware
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    return response

# Exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Необработанное исключение: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal Server Error",
            "detail": str(exc),
            "path": str(request.url)
        }
    )

# Подключение роутеров
app.include_router(prediction.router, prefix=settings.API_V1_PREFIX)
app.include_router(training.router, prefix=settings.API_V1_PREFIX)
app.include_router(management.router, prefix=settings.API_V1_PREFIX)
app.include_router(monitoring.router, prefix=settings.API_V1_PREFIX)

@app.get("/")
async def root():
    """Корневой эндпоинт"""
    return {
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "api": settings.API_V1_PREFIX
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower()
    )
