"""
Скрипт для обучения модели из командной строки
"""
import asyncio
import json
import sys
from pathlib import Path

# Добавление корневой директории в path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.services.training_service import TrainingService
from app.utils.logger import setup_logger

logger = setup_logger("train_script", "INFO")

async def train_from_file(
    data_file: str,
    epochs: int = 30,
    batch_size: int = 32,
    learning_rate: float = 0.001,
    model_name: str = "task_extraction_model"
):
    """
    Обучение модели из JSON файла
    
    Args:
        data_file: Путь к файлу с тренировочными данными
        epochs: Количество эпох
        batch_size: Размер батча
        learning_rate: Learning rate
        model_name: Имя модели
    """
    logger.info(f"📚 Загрузка данных из {data_file}")
    
    try:
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
            epochs=epochs,
            batch_size=batch_size,
            learning_rate=learning_rate,
            model_name=model_name,
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
        
    except FileNotFoundError:
        logger.error(f"❌ Файл {data_file} не найден")
    except json.JSONDecodeError:
        logger.error(f"❌ Ошибка парсинга JSON в {data_file}")
    except Exception as e:
        logger.error(f"❌ Ошибка: {e}", exc_info=True)

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Обучение модели извлечения задач')
    parser.add_argument('data_file', type=str, help='Путь к JSON файлу с данными')
    parser.add_argument('--epochs', type=int, default=30, help='Количество эпох')
    parser.add_argument('--batch-size', type=int, default=32, help='Размер батча')
    parser.add_argument('--lr', type=float, default=0.001, help='Learning rate')
    parser.add_argument('--name', type=str, default='task_extraction_model', help='Имя модели')
    
    args = parser.parse_args()
    
    asyncio.run(train_from_file(
        data_file=args.data_file,
        epochs=args.epochs,
        batch_size=args.batch_size,
        learning_rate=args.lr,
        model_name=args.name
    ))
