from fastapi import APIRouter, HTTPException, BackgroundTasks, status
from typing import Dict, Any

from app.schemas.training import (
    TrainingRequest,
    TrainingResponse,
    FineTuneRequest,
    TrainingProgress,
    TrainingStatus
)
from app.services.training_service import TrainingService
from app.utils.logger import setup_logger
from app.config.settings import get_settings

settings = get_settings()
logger = setup_logger("api.training", settings.LOG_LEVEL)

router = APIRouter(prefix="/training", tags=["Training"])

# Глобальный инстанс сервиса
training_service = TrainingService()

@router.post("/train", response_model=TrainingResponse, status_code=status.HTTP_202_ACCEPTED)
async def train_new_model(
    request: TrainingRequest,
    background_tasks: BackgroundTasks
):
    """
    Обучение новой модели с нуля
    
    - Запускается в фоновом режиме
    - Возвращает training_id для отслеживания прогресса
    - Минимум 10 примеров для обучения
    """
    try:
        # Конвертация Pydantic моделей в dict
        examples = [
            {
                "text": ex.text,
                "labels": ex.labels.model_dump()
            }
            for ex in request.training_examples
        ]
        
        # Запуск обучения в фоне
        training_id = f"train_{len(examples)}_{request.epochs}"
        
        background_tasks.add_task(
            training_service.train_new_model,
            training_examples=examples,
            epochs=request.epochs,
            batch_size=request.batch_size,
            learning_rate=request.learning_rate,
            model_name=request.model_name,
            save_checkpoint=request.save_checkpoint
        )
        
        logger.info(f"📚 Запущено обучение: {training_id}")
        
        return TrainingResponse(
            training_id=training_id,
            status=TrainingStatus.PENDING,
            message="Обучение запущено в фоновом режиме",
            model_name=request.model_name or settings.MODEL_NAME,
            total_examples=len(examples),
            epochs=request.epochs,
            estimated_duration_seconds=len(examples) * request.epochs // 10
        )
        
    except Exception as e:
        logger.error(f"❌ Ошибка при запуске обучения: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка запуска обучения: {str(e)}"
        )

@router.post("/fine-tune", response_model=TrainingResponse, status_code=status.HTTP_202_ACCEPTED)
async def fine_tune_model(
    request: FineTuneRequest,
    background_tasks: BackgroundTasks
):
    """
    Дообучение существующей модели на новых данных
    
    - Использует уже обученную модель как базу
    - Требует минимум 5 новых примеров
    - Может заморозить эмбеддинги для ускорения
    """
    try:
        examples = [
            {
                "text": ex.text,
                "labels": ex.labels.model_dump()
            }
            for ex in request.training_examples
        ]
        
        training_id = f"finetune_{len(examples)}_{request.epochs}"
        
        background_tasks.add_task(
            training_service.fine_tune_model,
            model_name=settings.MODEL_NAME,
            model_version=request.model_version,
            training_examples=examples,
            epochs=request.epochs,
            batch_size=request.batch_size,
            learning_rate=request.learning_rate,
            freeze_embedding=request.freeze_embedding
        )
        
        logger.info(f"🔄 Запущено дообучение: {training_id}")
        
        return TrainingResponse(
            training_id=training_id,
            status=TrainingStatus.PENDING,
            message="Дообучение запущено в фоновом режиме",
            model_name=f"{settings.MODEL_NAME}_finetuned",
            total_examples=len(examples),
            epochs=request.epochs,
            estimated_duration_seconds=len(examples) * request.epochs // 20
        )
        
    except Exception as e:
        logger.error(f"❌ Ошибка при дообучении: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка дообучения: {str(e)}"
        )

@router.get("/status/{training_id}", response_model=TrainingProgress)
async def get_training_status(training_id: str):
    """Получение статуса текущего обучения"""
    progress = training_service.get_training_progress(training_id)
    
    if not progress:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Обучение {training_id} не найдено или завершено"
        )
    
    return progress
