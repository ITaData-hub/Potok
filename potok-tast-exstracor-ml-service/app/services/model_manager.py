import torch
import pickle
import json
from pathlib import Path
from typing import Optional, Dict, Any
from datetime import datetime
import shutil

from app.config.settings import get_settings
from app.utils.logger import setup_logger
from app.utils.exceptions import ModelNotLoadedException, ModelNotTrainedException
from app.core.models import StatusNet
from app.core.vocabulary import Vocabulary

settings = get_settings()
logger = setup_logger("model_manager", settings.LOG_LEVEL)

class ModelManager:
    """Управление моделями - загрузка, сохранение, версионирование"""
    
    def __init__(self):
        self.models_dir = Path(settings.MODEL_DIR)
        self.models_dir.mkdir(parents=True, exist_ok=True)
        self.current_model: Optional[StatusNet] = None
        self.current_vocab: Optional[Vocabulary] = None
        self.current_encoders: Optional[Dict] = None
        self.current_version: Optional[str] = None
    
    def save_model(
        self,
        model: StatusNet,
        vocab: Vocabulary,
        encoders: Dict,
        model_name: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Сохранение модели с версионированием
        
        Args:
            model: Обученная модель
            vocab: Словарь
            encoders: Энкодеры
            model_name: Имя модели
            metadata: Дополнительные метаданные
            
        Returns:
            Версия сохраненной модели
        """
        version = datetime.now().strftime("%Y%m%d_%H%M%S")
        model_path = self.models_dir / model_name / version
        model_path.mkdir(parents=True, exist_ok=True)
        
        try:
            # Сохранение весов модели
            torch.save(model.state_dict(), model_path / "model.pth")
            
            # Сохранение словаря
            with open(model_path / "vocab.pkl", 'wb') as f:
                pickle.dump(vocab, f)
            
            # Сохранение энкодеров
            with open(model_path / "encoders.pkl", 'wb') as f:
                pickle.dump(encoders, f)
            
            # Сохранение метаданных
            metadata_full = {
                "model_name": model_name,
                "version": version,
                "saved_at": datetime.utcnow().isoformat(),
                "vocab_size": vocab.vocab_size,
                "device": settings.DEVICE,
                **(metadata or {})
            }
            
            with open(model_path / "metadata.json", 'w', encoding='utf-8') as f:
                json.dump(metadata_full, f, indent=2, ensure_ascii=False)
            
            # Создание симлинка на latest
            latest_link = self.models_dir / model_name / "latest"
            if latest_link.exists():
                latest_link.unlink()
            latest_link.symlink_to(version)
            
            logger.info(f"✅ Модель сохранена: {model_name}/{version}")
            return version
            
        except Exception as e:
            logger.error(f"❌ Ошибка сохранения модели: {e}")
            # Откат изменений
            if model_path.exists():
                shutil.rmtree(model_path)
            raise
    
    def load_model(
        self,
        model_name: str,
        version: Optional[str] = None,
        device: Optional[str] = None
    ) -> tuple[StatusNet, Vocabulary, Dict]:
        """
        Загрузка модели
        
        Args:
            model_name: Имя модели
            version: Версия (если None, загружается latest)
            device: Устройство (cpu/cuda)
            
        Returns:
            Кортеж (model, vocab, encoders)
        """
        if device is None:
            device = settings.DEVICE
        
        if version is None:
            model_path = self.models_dir / model_name / "latest"
        else:
            model_path = self.models_dir / model_name / version
        
        if not model_path.exists():
            raise ModelNotLoadedException(
                f"Модель {model_name}/{version or 'latest'} не найдена"
            )
        
        try:
            # Загрузка метаданных
            with open(model_path / "metadata.json", 'r', encoding='utf-8') as f:
                metadata = json.load(f)
            
            # Загрузка словаря
            with open(model_path / "vocab.pkl", 'rb') as f:
                vocab = pickle.load(f)
            
            # Загрузка энкодеров
            with open(model_path / "encoders.pkl", 'rb') as f:
                encoders = pickle.load(f)
            
            # Создание и загрузка модели
            model = StatusNet(
                vocab_size=vocab.vocab_size,
                embedding_dim=settings.EMBEDDING_DIM,
                hidden_dim=settings.HIDDEN_DIM,
                num_statuses=encoders['status'].num_classes
            ).to(device)
            
            model.load_state_dict(
                torch.load(model_path / "model.pth", map_location=device)
            )
            model.eval()
            
            self.current_model = model
            self.current_vocab = vocab
            self.current_encoders = encoders
            self.current_version = metadata['version']
            
            logger.info(
                f"✅ Модель загружена: {model_name}/{metadata['version']}"
            )
            
            return model, vocab, encoders
            
        except Exception as e:
            logger.error(f"❌ Ошибка загрузки модели: {e}")
            raise ModelNotLoadedException(f"Не удалось загрузить модель: {e}")
    
    def list_models(self) -> Dict[str, list]:
        """Получение списка доступных моделей"""
        models = {}
        
        for model_dir in self.models_dir.iterdir():
            if not model_dir.is_dir():
                continue
            
            versions = []
            for version_dir in model_dir.iterdir():
                if version_dir.is_dir() and version_dir.name != "latest":
                    metadata_file = version_dir / "metadata.json"
                    if metadata_file.exists():
                        with open(metadata_file, 'r', encoding='utf-8') as f:
                            metadata = json.load(f)
                        versions.append(metadata)
            
            if versions:
                models[model_dir.name] = sorted(
                    versions,
                    key=lambda x: x['saved_at'],
                    reverse=True
                )
        
        return models
    
    def delete_model(self, model_name: str, version: str) -> bool:
        """Удаление версии модели"""
        model_path = self.models_dir / model_name / version
        
        if not model_path.exists():
            logger.warning(f"Модель {model_name}/{version} не найдена")
            return False
        
        try:
            shutil.rmtree(model_path)
            logger.info(f"🗑️ Удалена модель: {model_name}/{version}")
            return True
        except Exception as e:
            logger.error(f"❌ Ошибка удаления модели: {e}")
            return False
    
    def get_current_model_info(self) -> Optional[Dict[str, Any]]:
        """Получение информации о текущей загруженной модели"""
        if self.current_model is None:
            return None
        
        return {
            "version": self.current_version,
            "vocab_size": self.current_vocab.vocab_size if self.current_vocab else 0,
            "is_training": self.current_model.training,
            "device": next(self.current_model.parameters()).device.type
        }
