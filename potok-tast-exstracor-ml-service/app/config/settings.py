from pydantic_settings import BaseSettings
from typing import List, Optional
from functools import lru_cache
import os

class Settings(BaseSettings):
    """Централизованная конфигурация приложения"""
    
    # API настройки
    APP_NAME: str = "Task Extraction AI API"
    APP_VERSION: str = "2.0.0"
    API_V1_PREFIX: str = "/api/v1"
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = False
    
    # Пути
    BASE_DIR: str = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    MODEL_DIR: str = "./data/models"
    TRAINING_DATA_DIR: str = "./data/training"
    LOG_DIR: str = "./data/logs"
    
    # Модель
    DEVICE: str = "cpu"
    MODEL_NAME: str = "task_extraction_model"
    EMBEDDING_DIM: int = 100
    HIDDEN_DIM: int = 128
    DROPOUT: float = 0.3
    NUM_HEADS: int = 4
    NUM_LAYERS: int = 2
    
    # Обучение
    DEFAULT_LEARNING_RATE: float = 0.001
    DEFAULT_EPOCHS: int = 30
    DEFAULT_BATCH_SIZE: int = 32
    MAX_TITLE_LEN: int = 55
    MAX_TEXT_LEN: int = 200
    
    # Лимиты API
    MAX_BATCH_SIZE: int = 100
    MAX_TEXT_LENGTH: int = 1000
    RATE_LIMIT_PREDICTION: int = 100  # запросов в минуту
    RATE_LIMIT_TRAINING: int = 5      # запросов в час
    
    # CORS
    CORS_ORIGINS: List[str] = ["*"]
    CORS_CREDENTIALS: bool = True
    CORS_METHODS: List[str] = ["*"]
    CORS_HEADERS: List[str] = ["*"]
    
    # Безопасность
    API_KEY: Optional[str] = None
    SECRET_KEY: str = "your-secret-key-change-in-production"
    
    # База данных (для хранения истории обучений)
    DATABASE_URL: Optional[str] = None
    
    # Мониторинг
    ENABLE_METRICS: bool = True
    ENABLE_TRACING: bool = False
    
    # Логирование
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "json"
    
    class Config:
        env_file = ".env"
        case_sensitive = True
        env_file_encoding = 'utf-8'

@lru_cache()
def get_settings() -> Settings:
    """Получение синглтона настроек"""
    return Settings()
