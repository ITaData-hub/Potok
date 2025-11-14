from fastapi import APIRouter, HTTPException, status
from typing import List

from app.schemas.task import (
    TaskRequest,
    TaskResponse,
    BatchTaskRequest,
    BatchTaskResponse
)
from app.services.prediction_service import PredictionService
from app.utils.logger import setup_logger
from app.config.settings import get_settings
from app.utils.exceptions import ModelNotLoadedException, PredictionException

settings = get_settings()
logger = setup_logger("api.prediction", settings.LOG_LEVEL)

router = APIRouter(prefix="/predict", tags=["Prediction"])

# Глобальный инстанс сервиса предсказаний
prediction_service = PredictionService()

@router.post("/", response_model=TaskResponse)
async def predict_task(request: TaskRequest):
    """
    Извлечение структурированной информации из текста задачи
    
    - Использует комбинацию правил и нейросети
    - Возвращает название, приоритет, дедлайн, категорию и другие поля
    - Результаты кешируются для ускорения повторных запросов
    """
    try:
        logger.info(f"📝 Запрос предсказания: {request.text[:50]}...")
        result = prediction_service.predict(request.text)
        logger.info(f"✅ Предсказание выполнено: {result.name}")
        return result
        
    except ModelNotLoadedException as e:
        logger.error(f"❌ Модель не загружена: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Модель не загружена. Загрузите модель через /management/load"
        )
    except PredictionException as e:
        logger.error(f"❌ Ошибка предсказания: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e.message)
        )
    except Exception as e:
        logger.error(f"❌ Неожиданная ошибка: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Внутренняя ошибка сервера: {str(e)}"
        )

@router.post("/batch", response_model=BatchTaskResponse)
async def predict_batch(request: BatchTaskRequest):
    """
    Пакетная обработка нескольких задач
    
    - Принимает до 100 задач за раз
    - Обрабатывает каждую независимо
    - Возвращает статистику обработки
    """
    try:
        logger.info(f"📦 Пакетный запрос: {len(request.texts)} задач")
        results = prediction_service.predict_batch(request.texts)
        
        successful = len(results)
        failed = len(request.texts) - successful
        
        logger.info(f"✅ Обработано: {successful} успешно, {failed} неудачно")
        
        return BatchTaskResponse(
            results=results,
            total=len(request.texts),
            successful=successful,
            failed=failed
        )
        
    except ModelNotLoadedException as e:
        logger.error(f"❌ Модель не загружена: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Модель не загружена"
        )
    except Exception as e:
        logger.error(f"❌ Ошибка пакетной обработки: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка пакетной обработки: {str(e)}"
        )
