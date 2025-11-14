from pydantic import BaseModel, Field, validator
from typing import List, Optional
from datetime import datetime

class TaskRequest(BaseModel):
    """Запрос на предсказание одной задачи"""
    text: str = Field(
        ...,
        min_length=3,
        max_length=1000,
        description="Текст задачи для анализа"
    )
    
    @validator('text')
    def validate_text(cls, v):
        if not v.strip():
            raise ValueError('Текст не может быть пустым')
        return v.strip()
    
    class Config:
        json_schema_extra = {
            "example": {
                "text": "Пожарить пельмени до пятницы, очень важно"
            }
        }

class TaskResponse(BaseModel):
    """Ответ с информацией о задаче"""
    name: str
    description: str
    priority: int = Field(..., ge=1, le=5)
    deadline: Optional[str]
    execution_time: str
    category: List[str]
    difficulty: int = Field(..., ge=1, le=10)
    stages: List[str]
    status: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    processed_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        json_schema_extra = {
            "example": {
                "name": "Пожарить пельмени",
                "description": "-",
                "priority": 4,
                "deadline": "2025-11-15",
                "execution_time": "-",
                "category": ["Кулинария"],
                "difficulty": 5,
                "stages": [],
                "status": "новая",
                "confidence": 0.85,
                "processed_at": "2025-11-08T16:30:00Z"
            }
        }

class BatchTaskRequest(BaseModel):
    """Запрос на пакетное предсказание"""
    texts: List[str] = Field(
        ...,
        min_items=1,
        max_items=100,
        description="Список текстов задач"
    )
    
    @validator('texts')
    def validate_texts(cls, v):
        return [text.strip() for text in v if text.strip()]
    
    class Config:
        json_schema_extra = {
            "example": {
                "texts": [
                    "Пожарить пельмени до пятницы, очень важно",
                    "ПЕРЕДЕЛАТЬ ВЕСЬ САЙТ!!! срочно, 8 часов"
                ]
            }
        }

class BatchTaskResponse(BaseModel):
    """Ответ на пакетное предсказание"""
    results: List[TaskResponse]
    total: int
    successful: int
    failed: int
    processed_at: datetime = Field(default_factory=datetime.utcnow)
