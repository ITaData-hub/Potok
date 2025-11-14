from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum

class TrainingStatus(str, Enum):
    """Статусы обучения"""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"

class TaskInfoForTraining(BaseModel):
    """Информация о задаче для обучения"""
    name: str
    description: str
    priority: int = Field(..., ge=1, le=5)
    deadline: Optional[str]
    execution_time: str
    category: List[str]
    difficulty: int = Field(..., ge=1, le=10)
    stages: List[str]
    status: str

class TrainingExample(BaseModel):
    """Один пример для обучения"""
    text: str = Field(..., min_length=3, max_length=1000)
    labels: TaskInfoForTraining
    
    class Config:
        json_schema_extra = {
            "example": {
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
            }
        }

class TrainingRequest(BaseModel):
    """Запрос на обучение модели"""
    training_examples: List[TrainingExample] = Field(
        ...,
        min_items=10,
        description="Примеры для обучения (минимум 10)"
    )
    epochs: int = Field(default=30, ge=1, le=200)
    batch_size: int = Field(default=32, ge=1, le=128)
    learning_rate: float = Field(default=0.001, gt=0.0, le=1.0)
    model_name: Optional[str] = Field(
        default=None,
        description="Имя модели (если не указано, используется дефолтное)"
    )
    save_checkpoint: bool = Field(
        default=True,
        description="Сохранять чекпоинты во время обучения"
    )
    
    @validator('training_examples')
    def validate_examples(cls, v):
        if len(v) < 10:
            raise ValueError('Необходимо минимум 10 примеров для обучения')
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "training_examples": [
                    {
                        "text": "Пожарить пельмени до пятницы",
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
                    }
                ],
                "epochs": 30,
                "batch_size": 32,
                "learning_rate": 0.001
            }
        }

class FineTuneRequest(BaseModel):
    """Запрос на дообучение существующей модели"""
    training_examples: List[TrainingExample] = Field(
        ...,
        min_items=5,
        description="Примеры для дообучения (минимум 5)"
    )
    epochs: int = Field(default=10, ge=1, le=100)
    batch_size: int = Field(default=16, ge=1, le=128)
    learning_rate: float = Field(default=0.0001, gt=0.0, le=1.0)
    freeze_embedding: bool = Field(
        default=True,
        description="Заморозить слой эмбеддингов"
    )
    model_version: Optional[str] = Field(
        default=None,
        description="Версия модели для дообучения"
    )

class TrainingResponse(BaseModel):
    """Ответ на запрос обучения"""
    training_id: str
    status: TrainingStatus
    message: str
    model_name: str
    total_examples: int
    epochs: int
    started_at: datetime = Field(default_factory=datetime.utcnow)
    estimated_duration_seconds: Optional[int] = None

class TrainingProgress(BaseModel):
    """Прогресс обучения"""
    training_id: str
    status: TrainingStatus
    current_epoch: int
    total_epochs: int
    current_loss: Optional[float] = None
    best_loss: Optional[float] = None
    elapsed_time_seconds: int
    estimated_remaining_seconds: Optional[int] = None
    metrics: Dict[str, Any] = Field(default_factory=dict)

class TrainingResult(BaseModel):
    """Результат обучения"""
    training_id: str
    status: TrainingStatus
    model_name: str
    model_version: str
    total_examples: int
    epochs_completed: int
    final_loss: float
    metrics: Dict[str, Any]
    started_at: datetime
    completed_at: datetime
    duration_seconds: int
