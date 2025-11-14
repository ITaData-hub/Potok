import torch
from typing import List, Optional, Dict, Any
from datetime import datetime

from app.config.settings import get_settings
from app.utils.logger import setup_logger
from app.utils.exceptions import ModelNotLoadedException, PredictionException
from app.services.model_manager import ModelManager
from app.core.rules_engine import ParsingRulesEngine
from app.schemas.task import TaskResponse
from dataclasses import dataclass

settings = get_settings()
logger = setup_logger("prediction_service", settings.LOG_LEVEL)

@dataclass
class TaskInfo:
    """Внутренняя структура результата"""
    name: str
    description: str
    priority: int
    deadline: Optional[str]
    execution_time: str
    category: List[str]
    difficulty: int
    stages: List[str]
    status: str
    confidence: float = 0.0

class PredictionService:
    """Сервис предсказаний на основе обученной модели"""
    
    def __init__(self):
        self.model_manager = ModelManager()
        self.model = None
        self.vocab = None
        self.encoders = None
        self.rules_engine = ParsingRulesEngine()
        self._cache: Dict[int, TaskInfo] = {}
        self.metrics = {
            'predictions': 0,
            'cache_hits': 0,
            'errors': 0
        }
        self.device = settings.DEVICE
    
    def load_model(
        self,
        model_name: Optional[str] = None,
        version: Optional[str] = None
    ):
        """Загрузка модели для предсказаний"""
        if model_name is None:
            model_name = settings.MODEL_NAME
        
        try:
            self.model, self.vocab, self.encoders = self.model_manager.load_model(
                model_name=model_name,
                version=version,
                device=self.device
            )
            logger.info(f"✅ Модель загружена для предсказаний: {model_name}")
        except Exception as e:
            logger.error(f"❌ Ошибка загрузки модели: {e}")
            raise ModelNotLoadedException(f"Не удалось загрузить модель: {e}")
    
    def predict(self, text: str) -> TaskResponse:
        """
        Предсказание для одной задачи
        
        Args:
            text: Текст задачи
            
        Returns:
            Структурированная информация о задаче
        """
        if self.model is None:
            raise ModelNotLoadedException("Модель не загружена")
        
        # Проверка кеша
        cache_key = hash(text)
        if cache_key in self._cache:
            self.metrics['cache_hits'] += 1
            cached_result = self._cache[cache_key]
            return self._convert_to_response(cached_result)
        
        self.metrics['predictions'] += 1
        
        try:
            # Извлечение признаков с помощью правил
            task_features = self._extract_features_from_rules(text)
            
            # Предсказание статуса нейросетью
            self.model.eval()
            with torch.no_grad():
                encoded_text = torch.tensor(
                    self.vocab.encode(text),
                    dtype=torch.long
                ).unsqueeze(0).to(self.device)
                
                outputs = self.model(encoded_text)
                probabilities = torch.softmax(outputs, dim=1)
                status_idx = outputs.argmax(dim=1).item()
                confidence = probabilities[0, status_idx].item()
                status = self.encoders['status'].decode(status_idx)
            
            # Объединение результатов
            result = TaskInfo(
                name=task_features['name'],
                description=task_features['description'],
                priority=task_features['priority'],
                deadline=task_features['deadline'],
                execution_time=task_features['execution_time'],
                category=task_features['category'],
                difficulty=task_features['difficulty'],
                stages=task_features['stages'],
                status=status,
                confidence=confidence
            )
            
            # Сохранение в кеш
            self._cache[cache_key] = result
            
            return self._convert_to_response(result)
            
        except Exception as e:
            self.metrics['errors'] += 1
            logger.error(f"❌ Ошибка предсказания: {e}")
            raise PredictionException(f"Ошибка при предсказании: {str(e)}")
    
    def predict_batch(self, texts: List[str]) -> List[TaskResponse]:
        """
        Пакетное предсказание
        
        Args:
            texts: Список текстов задач
            
        Returns:
            Список предсказаний
        """
        results = []
        for text in texts:
            try:
                result = self.predict(text)
                results.append(result)
            except Exception as e:
                logger.error(f"Ошибка в пакетном предсказании: {e}")
                # Можно либо пропустить, либо добавить заглушку
                continue
        
        return results
    
    def _extract_features_from_rules(self, text: str) -> Dict[str, Any]:
        """Извлечение признаков с помощью rule-based подхода"""
        return {
            'name': self.rules_engine.extract_title(text),
            'description': self.rules_engine.extract_description(text),
            'priority': self.rules_engine.extract_priority(text),
            'deadline': self.rules_engine.extract_deadline(text),
            'execution_time': self.rules_engine.extract_time(text),
            'category': self.rules_engine.extract_category(text),
            'difficulty': self.rules_engine.extract_complexity(text),
            'stages': self.rules_engine.extract_stages(text)
        }
    
    def _convert_to_response(self, task_info: TaskInfo) -> TaskResponse:
        """Конвертация внутренней структуры в API response"""
        return TaskResponse(
            name=task_info.name,
            description=task_info.description,
            priority=task_info.priority,
            deadline=task_info.deadline,
            execution_time=task_info.execution_time,
            category=task_info.category,
            difficulty=task_info.difficulty,
            stages=task_info.stages,
            status=task_info.status,
            confidence=task_info.confidence,
            processed_at=datetime.utcnow()
        )
    
    def get_metrics(self) -> Dict[str, Any]:
        """Получение метрик сервиса"""
        return {
            **self.metrics,
            'cache_size': len(self._cache),
            'vocab_size': self.vocab.vocab_size if self.vocab else 0,
            'model_loaded': self.model is not None
        }
    
    def clear_cache(self) -> int:
        """Очистка кеша"""
        cache_size = len(self._cache)
        self._cache.clear()
        logger.info(f"🧹 Кеш очищен: {cache_size} записей")
        return cache_size
