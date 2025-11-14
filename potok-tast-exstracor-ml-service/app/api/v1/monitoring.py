from fastapi import APIRouter, status
from datetime import datetime
from typing import Dict, Any

from app.services.prediction_service import PredictionService
from app.services.model_manager import ModelManager
from app.utils.logger import setup_logger
from app.config.settings import get_settings
from pydantic import BaseModel

settings = get_settings()
logger = setup_logger("api.monitoring", settings.LOG_LEVEL)

router = APIRouter(prefix="/monitoring", tags=["Monitoring"])

# Импорт сервисов
from app.api.v1.prediction import prediction_service

class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    timestamp: str
    metrics: Dict[str, Any]

@router.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Проверка состояния сервиса
    
    - Статус: healthy/unhealthy
    - Информация о загруженной модели
    - Базовые метрики
    """
    metrics = prediction_service.get_metrics()
    
    return HealthResponse(
        status="healthy" if metrics['model_loaded'] else "unhealthy",
        model_loaded=metrics['model_loaded'],
        timestamp=datetime.utcnow().isoformat(),
        metrics=metrics
    )

@router.get("/metrics")
async def get_detailed_metrics():
    """
    Детальные метрики работы сервиса
    
    - Количество предсказаний
    - Cache hit rate
    - Ошибки
    - Информация о модели
    """
    metrics = prediction_service.get_metrics()
    
    cache_hit_rate = 0.0
    total_requests = metrics['predictions'] + metrics['cache_hits']
    if total_requests > 0:
        cache_hit_rate = metrics['cache_hits'] / total_requests
    
    return {
        "predictions": {
            "total": metrics['predictions'],
            "cache_hits": metrics['cache_hits'],
            "cache_hit_rate": round(cache_hit_rate * 100, 2),
            "errors": metrics['errors']
        },
        "cache": {
            "size": metrics['cache_size'],
            "max_size": "unlimited"
        },
        "model": {
            "loaded": metrics['model_loaded'],
            "vocab_size": metrics['vocab_size']
        },
        "timestamp": datetime.utcnow().isoformat()
    }

@router.post("/cache/clear")
async def clear_cache():
    """Очистка кеша предсказаний"""
    cleared = prediction_service.clear_cache()
    
    return {
        "message": "Кеш успешно очищен",
        "cleared_items": cleared,
        "timestamp": datetime.utcnow().isoformat()
    }

@router.get("/ping")
async def ping():
    """Простая проверка доступности API"""
    return {"status": "pong", "timestamp": datetime.utcnow().isoformat()}
