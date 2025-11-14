from fastapi import APIRouter, HTTPException, status
from typing import Dict, Any, List, Optional
from datetime import datetime

from app.services.model_manager import ModelManager
from app.services.prediction_service import PredictionService
from app.utils.logger import setup_logger
from app.config.settings import get_settings
from pydantic import BaseModel

settings = get_settings()
logger = setup_logger("api.management", settings.LOG_LEVEL)

router = APIRouter(prefix="/management", tags=["Management"])

# Глобальные инстансы
model_manager = ModelManager()

# Импорт prediction_service из модуля prediction
from app.api.v1.prediction import prediction_service

class LoadModelRequest(BaseModel):
    model_name: str
    version: Optional[str] = None

class ModelInfo(BaseModel):
    model_name: str
    version: str
    saved_at: str
    vocab_size: int
    metadata: Dict[str, Any]

@router.post("/load")
async def load_model(request: LoadModelRequest):
    """
    Загрузка модели в память для предсказаний
    
    - model_name: имя модели
    - version: версия (если не указана, загружается latest)
    """
    try:
        logger.info(f"📥 Загрузка модели: {request.model_name}/{request.version or 'latest'}")
        
        prediction_service.load_model(
            model_name=request.model_name,
            version=request.version
        )
        
        model_info = model_manager.get_current_model_info()
        
        return {
            "message": "Модель успешно загружена",
            "model_name": request.model_name,
            "version": model_info['version'] if model_info else 'unknown',
            "vocab_size": model_info['vocab_size'] if model_info else 0,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"❌ Ошибка загрузки модели: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Не удалось загрузить модель: {str(e)}"
        )

@router.get("/models", response_model=Dict[str, List[ModelInfo]])
async def list_models():
    """
    Получение списка всех доступных моделей и их версий
    
    Возвращает структуру:
    {
        "model_name": [
            {"version": "...", "saved_at": "...", ...}
        ]
    }
    """
    try:
        models = model_manager.list_models()
        return models
        
    except Exception as e:
        logger.error(f"❌ Ошибка получения списка моделей: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка получения списка: {str(e)}"
        )

@router.delete("/models/{model_name}/{version}")
async def delete_model(model_name: str, version: str):
    """
    Удаление конкретной версии модели
    
    ⚠️ ВНИМАНИЕ: Операция необратима!
    """
    try:
        success = model_manager.delete_model(model_name, version)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Модель {model_name}/{version} не найдена"
            )
        
        return {
            "message": "Модель успешно удалена",
            "model_name": model_name,
            "version": version,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Ошибка удаления модели: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка удаления: {str(e)}"
        )

@router.get("/current-model")
async def get_current_model():
    """Информация о текущей загруженной модели"""
    model_info = model_manager.get_current_model_info()
    
    if not model_info:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Модель не загружена"
        )
    
    return {
        "model_info": model_info,
        "timestamp": datetime.utcnow().isoformat()
    }
