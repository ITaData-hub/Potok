import logging
import sys
from pathlib import Path
from typing import Optional
from datetime import datetime
import json

class JSONFormatter(logging.Formatter):
    """Форматтер для JSON логов"""
    def format(self, record: logging.LogRecord) -> str:
        log_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno
        }
        
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)
        
        return json.dumps(log_data, ensure_ascii=False)

def setup_logger(
    name: str,
    log_level: str = "INFO",
    log_dir: Optional[Path] = None,
    log_format: str = "json"
) -> logging.Logger:
    """Настройка логгера"""
    logger = logging.getLogger(name)
    logger.setLevel(getattr(logging, log_level.upper()))
    
    # Удаление существующих хэндлеров
    logger.handlers.clear()
    
    # Console handler - исправленная версия для Windows
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.DEBUG)
    
    # Устанавливаем кодировку UTF-8 для handler (если возможно)
    try:
        console_handler.stream.reconfigure(encoding='utf-8')
    except (AttributeError, OSError):
        # Если reconfigure недоступен или не работает, продолжаем без него
        pass
    
    if log_format == "json":
        console_handler.setFormatter(JSONFormatter())
    else:
        console_handler.setFormatter(
            logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            )
        )
    
    logger.addHandler(console_handler)
    
    # File handler (если указана директория)
    if log_dir:
        log_dir.mkdir(parents=True, exist_ok=True)
        file_handler = logging.FileHandler(
            log_dir / f"{name}_{datetime.now().strftime('%Y%m%d')}.log",
            encoding='utf-8'
        )
        file_handler.setLevel(logging.INFO)
        
        if log_format == "json":
            file_handler.setFormatter(JSONFormatter())
        else:
            file_handler.setFormatter(
                logging.Formatter(
                    '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
                )
            )
        
        logger.addHandler(file_handler)
    
    return logger
