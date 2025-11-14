import torch
from torch.utils.data import Dataset
from typing import List, Dict
from dataclasses import dataclass
from typing import Optional

from app.core.vocabulary import Vocabulary

@dataclass
class TaskInfo:
    """Информация о задаче"""
    name: str
    description: str
    priority: int
    deadline: Optional[str]
    execution_time: str
    category: List[str]
    difficulty: int
    stages: List[str]
    status: str

@dataclass
class TrainingData:
    """Тренировочные данные"""
    text: str
    labels: TaskInfo

class TaskDataset(Dataset):
    """Dataset для обучения модели"""
    
    def __init__(
        self,
        texts: List[str],
        labels: List[TaskInfo],
        vocab: Vocabulary,
        encoders: Dict
    ):
        self.texts = texts
        self.labels = labels
        self.vocab = vocab
        self.encoders = encoders
    
    def __len__(self):
        return len(self.texts)
    
    def __getitem__(self, idx):
        text = self.texts[idx]
        label = self.labels[idx]
        
        # Кодирование текста
        encoded_text = torch.tensor(
            self.vocab.encode(text),
            dtype=torch.long
        )
        
        # Кодирование статуса
        status_encoded = self.encoders['status'].encode(label.status)
        status = torch.tensor(status_encoded, dtype=torch.long)
        
        return {
            'text': encoded_text,
            'status': status
        }
