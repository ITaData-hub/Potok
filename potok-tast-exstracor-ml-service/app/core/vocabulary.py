from collections import Counter
from typing import List

class Vocabulary:
    """Словарь для кодирования текста"""
    
    def __init__(self):
        self.word2idx = {'<PAD>': 0, '<UNK>': 1}
        self.idx2word = {0: '<PAD>', 1: '<UNK>'}
        self.word_count = Counter()
        self.vocab_size = 2
    
    def add_word(self, word: str):
        """Добавление слова в словарь"""
        if word not in self.word2idx:
            self.word2idx[word] = self.vocab_size
            self.idx2word[self.vocab_size] = word
            self.vocab_size += 1
        self.word_count[word] += 1
    
    def encode(self, text: str, max_len: int = 200) -> List[int]:
        """Кодирование текста в индексы"""
        words = text.lower().split()[:max_len]
        encoded = [self.word2idx.get(word, self.word2idx['<UNK>']) for word in words]
        
        # Padding
        if len(encoded) < max_len:
            encoded += [self.word2idx['<PAD>']] * (max_len - len(encoded))
        
        return encoded
    
    def decode(self, indices: List[int]) -> str:
        """Декодирование индексов в текст"""
        words = [self.idx2word.get(idx, '<UNK>') for idx in indices]
        return ' '.join(word for word in words if word not in ['<PAD>', '<UNK>'])
    
    def build_from_texts(self, texts: List[str]):
        """Построение словаря из списка текстов"""
        for text in texts:
            for word in text.lower().split():
                self.add_word(word)

class LabelEncoder:
    """Энкодер для меток классов"""
    
    def __init__(self):
        self.label2idx = {}
        self.idx2label = {}
        self.num_classes = 0
    
    def fit(self, labels: List[str]):
        """Обучение энкодера на списке меток"""
        unique_labels = sorted(set(labels))
        for idx, label in enumerate(unique_labels):
            self.label2idx[label] = idx
            self.idx2label[idx] = label
        self.num_classes = len(unique_labels)
    
    def encode(self, label: str) -> int:
        """Кодирование метки в индекс"""
        return self.label2idx.get(label, 0)
    
    def decode(self, idx: int) -> str:
        """Декодирование индекса в метку"""
        return self.idx2label.get(idx, '')
    
    def get_classes(self) -> List[str]:
        """Получение списка всех классов"""
        return [self.idx2label[i] for i in range(self.num_classes)]
