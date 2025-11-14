import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, random_split
from typing import List, Dict, Any, Optional, Callable
from datetime import datetime
import asyncio
from pathlib import Path
import uuid

from app.config.settings import get_settings
from app.utils.logger import setup_logger
from app.utils.exceptions import TrainingException, InsufficientDataException
from app.core.models import StatusNet
from app.core.vocabulary import Vocabulary, LabelEncoder
from app.core.dataset import TaskDataset
from app.services.model_manager import ModelManager
from app.schemas.training import TrainingStatus, TrainingProgress

settings = get_settings()
logger = setup_logger("training_service", settings.LOG_LEVEL)

class TrainingService:
    """Сервис для обучения и дообучения моделей"""
    
    def __init__(self):
        self.model_manager = ModelManager()
        self.active_trainings: Dict[str, TrainingProgress] = {}
        self.device = settings.DEVICE
    
    async def train_new_model(
        self,
        training_examples: List[Dict[str, Any]],
        epochs: int = 30,
        batch_size: int = 32,
        learning_rate: float = 0.001,
        model_name: Optional[str] = None,
        save_checkpoint: bool = True,
        progress_callback: Optional[Callable] = None
    ) -> Dict[str, Any]:
        """
        Обучение новой модели с нуля
        
        Args:
            training_examples: Примеры для обучения
            epochs: Количество эпох
            batch_size: Размер батча
            learning_rate: Learning rate
            model_name: Имя модели
            save_checkpoint: Сохранять чекпоинты
            progress_callback: Callback для отслеживания прогресса
            
        Returns:
            Результат обучения
        """
        training_id = str(uuid.uuid4())
        start_time = datetime.utcnow()
        
        if len(training_examples) < 10:
            raise InsufficientDataException(
                "Недостаточно данных для обучения (минимум 10 примеров)"
            )
        
        if model_name is None:
            model_name = f"{settings.MODEL_NAME}_{start_time.strftime('%Y%m%d')}"
        
        logger.info(
            f"🚀 Начало обучения модели: {model_name} "
            f"(примеров: {len(training_examples)}, эпох: {epochs})"
        )
        
        try:
            # Подготовка данных
            vocab = Vocabulary()
            encoders = self._prepare_encoders(training_examples)
            dataset = self._prepare_dataset(training_examples, vocab, encoders)
            
            # Разделение на train/val
            val_size = max(1, int(len(dataset) * 0.1))
            train_size = len(dataset) - val_size
            
            train_dataset, val_dataset = random_split(
                dataset, [train_size, val_size]
            )
            
            train_loader = DataLoader(
                train_dataset,
                batch_size=batch_size,
                shuffle=True
            )
            
            val_loader = DataLoader(
                val_dataset,
                batch_size=batch_size,
                shuffle=False
            ) if val_size > 0 else None
            
            # Создание модели
            model = StatusNet(
                vocab_size=vocab.vocab_size,
                embedding_dim=settings.EMBEDDING_DIM,
                hidden_dim=settings.HIDDEN_DIM,
                num_statuses=encoders['status'].num_classes
            ).to(self.device)
            
            optimizer = optim.Adam(model.parameters(), lr=learning_rate)
            criterion = nn.CrossEntropyLoss()
            
            # Инициализация прогресса
            progress = TrainingProgress(
                training_id=training_id,
                status=TrainingStatus.IN_PROGRESS,
                current_epoch=0,
                total_epochs=epochs,
                elapsed_time_seconds=0
            )
            self.active_trainings[training_id] = progress
            
            # Обучение
            best_loss = float('inf')
            training_history = []
            
            for epoch in range(epochs):
                epoch_start = datetime.utcnow()
                
                # Training loop
                model.train()
                train_loss = 0.0
                
                for batch in train_loader:
                    text = batch['text'].to(self.device)
                    status = batch['status'].to(self.device)
                    
                    optimizer.zero_grad()
                    outputs = model(text)
                    loss = criterion(outputs, status)
                    loss.backward()
                    torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
                    optimizer.step()
                    
                    train_loss += loss.item()
                
                avg_train_loss = train_loss / len(train_loader)
                
                # Validation loop
                val_loss = None
                if val_loader:
                    model.eval()
                    val_loss_total = 0.0
                    
                    with torch.no_grad():
                        for batch in val_loader:
                            text = batch['text'].to(self.device)
                            status = batch['status'].to(self.device)
                            outputs = model(text)
                            loss = criterion(outputs, status)
                            val_loss_total += loss.item()
                    
                    val_loss = val_loss_total / len(val_loader)
                
                # Сохранение лучшей модели
                current_loss = val_loss if val_loss else avg_train_loss
                if current_loss < best_loss:
                    best_loss = current_loss
                
                # Обновление прогресса
                elapsed = (datetime.utcnow() - start_time).total_seconds()
                progress.current_epoch = epoch + 1
                progress.current_loss = avg_train_loss
                progress.best_loss = best_loss
                progress.elapsed_time_seconds = int(elapsed)
                
                if epoch > 0:
                    avg_epoch_time = elapsed / (epoch + 1)
                    remaining_epochs = epochs - (epoch + 1)
                    progress.estimated_remaining_seconds = int(
                        avg_epoch_time * remaining_epochs
                    )
                
                training_history.append({
                    "epoch": epoch + 1,
                    "train_loss": avg_train_loss,
                    "val_loss": val_loss,
                    "timestamp": datetime.utcnow().isoformat()
                })
                
                if progress_callback:
                    await progress_callback(progress)
                
                val_loss_str = f"{val_loss:.4f}" if val_loss is not None else "N/A"
                logger.info(
                    f"Epoch {epoch + 1}/{epochs} | "
                    f"Train Loss: {avg_train_loss:.4f} | "
                    f"Val Loss: {val_loss_str}"
                )
            
            # Сохранение модели
            version = self.model_manager.save_model(
                model=model,
                vocab=vocab,
                encoders=encoders,
                model_name=model_name,
                metadata={
                    "training_id": training_id,
                    "epochs": epochs,
                    "batch_size": batch_size,
                    "learning_rate": learning_rate,
                    "total_examples": len(training_examples),
                    "best_loss": best_loss,
                    "training_history": training_history
                }
            )
            
            # Финальный статус
            progress.status = TrainingStatus.COMPLETED
            duration = (datetime.utcnow() - start_time).total_seconds()
            
            result = {
                "training_id": training_id,
                "status": "completed",
                "model_name": model_name,
                "model_version": version,
                "total_examples": len(training_examples),
                "epochs_completed": epochs,
                "final_loss": best_loss,
                "duration_seconds": int(duration),
                "metrics": {
                    "vocab_size": vocab.vocab_size,
                    "train_samples": train_size,
                    "val_samples": val_size,
                    "best_loss": best_loss
                }
            }
            
            logger.info(f"✅ Обучение завершено: {model_name}/{version}")
            return result
            
        except Exception as e:
            logger.error(f"❌ Ошибка при обучении: {e}")
            progress.status = TrainingStatus.FAILED
            raise TrainingException(f"Ошибка обучения: {str(e)}")
        
        finally:
            if training_id in self.active_trainings:
                del self.active_trainings[training_id]
    
    async def fine_tune_model(
        self,
        model_name: str,
        model_version: Optional[str],
        training_examples: List[Dict[str, Any]],
        epochs: int = 10,
        batch_size: int = 16,
        learning_rate: float = 0.0001,
        freeze_embedding: bool = True
    ) -> Dict[str, Any]:
        """
        Дообучение существующей модели
        
        Args:
            model_name: Имя базовой модели
            model_version: Версия базовой модели
            training_examples: Новые примеры
            epochs: Количество эпох
            batch_size: Размер батча
            learning_rate: Learning rate (обычно меньше, чем при обучении с нуля)
            freeze_embedding: Заморозить слой эмбеддингов
            
        Returns:
            Результат дообучения
        """
        training_id = str(uuid.uuid4())
        start_time = datetime.utcnow()
        
        logger.info(f"🔄 Начало дообучения модели: {model_name}")
        
        try:
            # Загрузка базовой модели
            model, vocab, encoders = self.model_manager.load_model(
                model_name, model_version
            )
            
            # Заморозка эмбеддингов если требуется
            if freeze_embedding:
                for param in model.embedding.parameters():
                    param.requires_grad = False
                logger.info("🔒 Слой эмбеддингов заморожен")
            
            # Подготовка новых данных
            dataset = self._prepare_dataset(training_examples, vocab, encoders)
            train_loader = DataLoader(dataset, batch_size=batch_size, shuffle=True)
            
            # Оптимизатор и критерий
            optimizer = optim.Adam(
                filter(lambda p: p.requires_grad, model.parameters()),
                lr=learning_rate
            )
            criterion = nn.CrossEntropyLoss()
            
            # Дообучение
            model.train()
            best_loss = float('inf')
            
            for epoch in range(epochs):
                epoch_loss = 0.0
                
                for batch in train_loader:
                    text = batch['text'].to(self.device)
                    status = batch['status'].to(self.device)
                    
                    optimizer.zero_grad()
                    outputs = model(text)
                    loss = criterion(outputs, status)
                    loss.backward()
                    optimizer.step()
                    
                    epoch_loss += loss.item()
                
                avg_loss = epoch_loss / len(train_loader)
                best_loss = min(best_loss, avg_loss)
                
                logger.info(f"Epoch {epoch + 1}/{epochs} | Loss: {avg_loss:.4f}")
            
            # Сохранение дообученной модели
            new_model_name = f"{model_name}_finetuned"
            version = self.model_manager.save_model(
                model=model,
                vocab=vocab,
                encoders=encoders,
                model_name=new_model_name,
                metadata={
                    "training_id": training_id,
                    "base_model": model_name,
                    "base_version": model_version,
                    "fine_tuned": True,
                    "epochs": epochs,
                    "new_examples": len(training_examples),
                    "best_loss": best_loss
                }
            )
            
            duration = (datetime.utcnow() - start_time).total_seconds()
            
            return {
                "training_id": training_id,
                "status": "completed",
                "model_name": new_model_name,
                "model_version": version,
                "base_model": model_name,
                "new_examples": len(training_examples),
                "epochs_completed": epochs,
                "final_loss": best_loss,
                "duration_seconds": int(duration)
            }
            
        except Exception as e:
            logger.error(f"❌ Ошибка при дообучении: {e}")
            raise TrainingException(f"Ошибка дообучения: {str(e)}")
    
    def get_training_progress(self, training_id: str) -> Optional[TrainingProgress]:
        """Получение прогресса обучения"""
        return self.active_trainings.get(training_id)
    
    def _prepare_encoders(self, training_examples: List[Dict]) -> Dict:
        """Подготовка энкодеров"""
        status_encoder = LabelEncoder()
        statuses = [ex['labels']['status'] for ex in training_examples]
        status_encoder.fit(statuses)
        return {'status': status_encoder}
    
    def _prepare_dataset(
        self,
        training_examples: List[Dict],
        vocab: Vocabulary,
        encoders: Dict
    ) -> TaskDataset:
        """Подготовка датасета"""
        texts = [ex['text'] for ex in training_examples]
        vocab.build_from_texts(texts)
        
        # Конвертация в нужный формат
        from app.core.dataset import TrainingData, TaskInfo
        
        formatted_examples = []
        for ex in training_examples:
            labels = ex['labels']
            task_info = TaskInfo(
                name=labels['name'],
                description=labels['description'],
                priority=labels['priority'],
                deadline=labels.get('deadline'),
                execution_time=labels['execution_time'],
                category=labels['category'],
                difficulty=labels['difficulty'],
                stages=labels['stages'],
                status=labels['status']
            )
            formatted_examples.append(TrainingData(text=ex['text'], labels=task_info))
        
        return TaskDataset(
            texts=[ex.text for ex in formatted_examples],
            labels=[ex.labels for ex in formatted_examples],
            vocab=vocab,
            encoders=encoders
        )
