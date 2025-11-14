import asyncio
import json
import sys
from pathlib import Path

# Добавление корневой директории в path
sys.path.insert(0, str(Path(__file__).parent))

from app.services.training_service import TrainingService
from app.utils.logger import setup_logger

logger = setup_logger("train_script", "INFO")

async def train():
    """Обучение модели"""
    
    # Загрузка данных
    data_file = "app/data/training/training_data_20251110.json"
    
    logger.info(f"📚 Загрузка данных из {data_file}")
    
    with open(data_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    training_examples = data.get('training_examples', [])
    
    if len(training_examples) < 10:
        logger.error("❌ Недостаточно данных (минимум 10 примеров)")
        return
    
    logger.info(f"✅ Загружено {len(training_examples)} примеров")
    
    # Создание сервиса обучения
    training_service = TrainingService()
    
    # Запуск обучения
    logger.info("🚀 Начало обучения...")
    
    result = await training_service.train_new_model(
        training_examples=training_examples,
        epochs=30,
        batch_size=5,  # Маленький batch для небольшого датасета
        learning_rate=0.001,
        model_name="task_extraction_model",
        save_checkpoint=True
    )
    
    logger.info("=" * 70)
    logger.info("✅ ОБУЧЕНИЕ ЗАВЕРШЕНО")
    logger.info("=" * 70)
    logger.info(f"Модель: {result['model_name']}")
    logger.info(f"Версия: {result['model_version']}")
    logger.info(f"Примеров: {result['total_examples']}")
    logger.info(f"Эпох: {result['epochs_completed']}")
    logger.info(f"Финальный loss: {result['final_loss']:.4f}")
    logger.info(f"Время: {result['duration_seconds']} сек")
    logger.info("=" * 70)

if __name__ == "__main__":
    asyncio.run(train())
