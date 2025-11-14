class TaskExtractionException(Exception):
    """Базовое исключение для сервиса"""
    def __init__(self, message: str, details: dict = None):
        self.message = message
        self.details = details or {}
        super().__init__(self.message)

class ModelNotLoadedException(TaskExtractionException):
    """Модель не загружена"""
    pass

class ModelNotTrainedException(TaskExtractionException):
    """Модель не обучена"""
    pass

class TrainingException(TaskExtractionException):
    """Ошибка при обучении"""
    pass

class PredictionException(TaskExtractionException):
    """Ошибка при предсказании"""
    pass

class ValidationException(TaskExtractionException):
    """Ошибка валидации данных"""
    pass

class InsufficientDataException(TaskExtractionException):
    """Недостаточно данных для обучения"""
    pass
