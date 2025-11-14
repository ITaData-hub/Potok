import re
from datetime import datetime, timedelta
from typing import List, Optional

class ParsingRulesEngine:
    """Механизм извлечения информации на основе правил"""
    
    def __init__(self):
        self.action_verbs = [
            'реализовать', 'разработать', 'создать', 'написать', 'подготовить',
            'провести', 'организовать', 'покрасить', 'пожарить', 'приготовить',
            'купить', 'переделать', 'исправить', 'оптимизировать', 'настроить',
            'установить', 'развернуть', 'запустить', 'проверить', 'позвонить',
            'отправить', 'закончить', 'тестировать', 'интегрировать', 'мигрировать',
            'нанять', 'испечь', 'сделать', 'отредактировать', 'снять', 'анализировать',
            'запланировать', 'разложить', 'собрать', 'упаковать', 'задизайнить',
            'дизайнить', 'варить', 'готовить'
        ]
        
        self.exclude_words = {
            'весь', 'всё', 'все', 'в', 'на', 'к', 'по', 'из', 'для',
            'максимально', 'как', 'можно', 'очень', 'совсем', 'до', 'перед',
            'ко', 'за', 'день', 'ночь', 'неделю', 'месяц', 'и', 'или'
        }
        
        self.priority_rules = {
            1: ['очень низкий', 'может быть', 'не важно', 'совсем не важно', 'не срочно'],
            2: ['низкий', 'низший', 'можно подождать', 'не спешить', 'техдолг'],
            5: ['срочно', 'критично', 'немедленно', 'очень важно', '!!!', 'как можно быстрее',
                'срочняк', 'срочняга', 'быстрее всего', 'как можно быстро', 'упал сервер',
                'баг в продакшене', 'горит', 'неотложно'],
            4: ['важно', 'высокий приоритет', '!!', 'нужно быстро', 'поскорее',
                'для релиза', 'клиент ждёт', 'важное', 'не откладывать', 'надо', 'очень надо']
        }
        
        self.complexity_rules = {
            1: ['элементарно', 'за 5 минут', 'тривиально'],
            2: ['просто', 'легко', 'простой'],
            3: ['не очень сложно', 'стандартно'],
            5: ['сложно', 'требует опыта'],
            7: ['очень сложно', 'нелегко'],
            8: ['архи-сложно', 'экспертный уровень'],
            9: ['максимально сложно', 'требует исследования'],
            10: ['невозможно', 'требует революционного подхода']
        }
        
        self.category_rules = {
            'Кулинария': [r'приготовить|пожарить|торт|еда|блюдо|пельмени|курица|начос|манты|варить|готовить'],
            'Frontend': [r'фронтенд|ui|дизайн|макет|верстка|задизайнить|дизайнить'],
            'Backend': [r'бэкенд|api|сервер|база|хранилище'],
            'IT': [r'программирование|разработка|код|программа'],
            'Веб-разработка': [r'веб|website|сайт|интернет|сервис'],
            'Дизайн': [r'дизайн|макет|иконки|логотип'],
            'Маркетинг': [r'маркетинг|реклама|кампания'],
            'Контент': [r'контент|текст|статья|копирайт'],
            'Видео': [r'видео|монтаж|съемка'],
            'Строительство': [r'покрасить|ремонт|строительство|краска|стена'],
            'HR': [r'нанять|рекрутинг|кандидат'],
            'Аналитика': [r'анализ|отчет|статистика'],
            'Быт': [r'носки|разложить|убрать|помыть|постирать'],
        }
        
        self.months = {
            'января': 1, 'янв': 1, 'февраля': 2, 'февр': 2, 'марта': 3, 'март': 3,
            'апреля': 4, 'апр': 4, 'мая': 5, 'май': 5, 'июня': 6, 'июн': 6,
            'июля': 7, 'июль': 7, 'августа': 8, 'август': 8, 'сентября': 9,
            'сентябр': 9, 'октября': 10, 'октябр': 10, 'ноября': 11, 'ноябр': 11,
            'декабря': 12, 'декабр': 12
        }
        
        self.weekdays = {
            'понедельник': 0, 'понедельн': 0, 'вторник': 1, 'вторн': 1,
            'среда': 2, 'сред': 2, 'четверг': 3, 'четв': 3, 'пятница': 4,
            'пятниц': 4, 'пятн': 4, 'суббота': 5, 'суббот': 5, 'воскресенье': 6,
            'воскресень': 6, 'вскр': 6
        }
    
    def extract_title(self, text: str) -> str:
        """Извлечение названия задачи"""
        clean_text = re.sub(r'\s+(до|к|ко|на|перед)\s+\S+.*', '', text)
        clean_text = re.sub(r'\s+\d+\s+(час|минут|дня|дней).*', '', clean_text)
        clean_text = re.sub(r'\s+(очень\s+)?(важно|надо|не важно).*', '', clean_text)
        
        for verb in self.action_verbs:
            pattern = rf'\b{verb}\b\s+([^,.!?;:\n]+)'
            match = re.search(pattern, clean_text, re.IGNORECASE)
            if match:
                obj = match.group(1).strip()
                obj = re.sub(r'\s+(в|на|к|по|из|для|как|когда).*', '', obj)
                words = obj.split()
                words = [w for w in words if w.lower() not in self.exclude_words and len(w) > 1]
                if words:
                    obj = ' '.join(words[:3])
                    title = f"{verb.capitalize()} {obj}"
                    return title[:55]
        
        first = re.match(r'^([^.!?,;:]+)', text.strip())
        if first:
            title = first.group(1).strip()
            title = re.sub(r'\s+(до|к|ко|на|перед|очень|важно|надо).*', '', title)
            return title[:55]
        return "Задача"
    
    def extract_deadline(self, text: str) -> Optional[str]:
        """Извлечение дедлайна"""
        today = datetime.now()
        text_lower = text.lower()
        
        if re.search(r'\bсегодня\b', text_lower):
            return today.strftime("%Y-%m-%d")
        
        if re.search(r'\bзавтра|завтрашн', text_lower):
            return (today + timedelta(days=1)).strftime("%Y-%m-%d")
        
        if re.search(r'\b(после\s+завтра|послезавтра)\b', text_lower):
            return (today + timedelta(days=2)).strftime("%Y-%m-%d")
        
        current_weekday = today.weekday()
        for day_pattern, target_day in self.weekdays.items():
            if re.search(day_pattern, text_lower):
                days_ahead = target_day - current_weekday
                if days_ahead <= 0:
                    days_ahead += 7
                return (today + timedelta(days=days_ahead)).strftime("%Y-%m-%d")
        
        return None
    
    def extract_description(self, text: str) -> str:
        """Извлечение описания"""
        if ',' in text:
            parts = text.split(',', 1)
            desc = parts[1].strip()
            desc = re.sub(r'(до|к|ко|на|перед)\s+\S+.*', '', desc)
            desc = re.sub(r'(очень\s+)?(важно|надо|не важно).*', '', desc)
            if 5 < len(desc) < 150:
                return desc
        return "-"
    
    def extract_priority(self, text: str) -> int:
        """Извлечение приоритета"""
        text_lower = text.lower()
        for level in [1, 5, 4, 2]:
            for keyword in self.priority_rules.get(level, []):
                if keyword in text_lower:
                    return level
        return 3
    
    def extract_complexity(self, text: str) -> int:
        """Извлечение сложности"""
        text_lower = text.lower()
        for complexity_level in range(10, 0, -1):
            for keyword in self.complexity_rules.get(complexity_level, []):
                if keyword in text_lower:
                    return complexity_level
        return 5
    
    def extract_category(self, text: str) -> List[str]:
        """Извлечение категорий"""
        text_lower = text.lower()
        found = []
        for category, keywords in self.category_rules.items():
            for keyword in keywords:
                if re.search(keyword, text_lower):
                    if category not in found:
                        found.append(category)
                    if category == 'Кулинария':
                        return [category]
                    break
        return found if found else ['Общее']
    
    def extract_time(self, text: str) -> str:
        """Извлечение времени выполнения"""
        text_lower = text.lower()
        hours = 0
        patterns = [r'([0-9]+)\s*ч(?:ас)?(?:ов)?', r'([0-9]+)\s+часов?', r'примерно\s+([0-9]+)', r'~([0-9]+)\s*ч']
        for pattern in patterns:
            match = re.search(pattern, text_lower)
            if match:
                hours = int(match.group(1))
                break
        if hours == 0:
            if re.search(r'пару\s+час', text_lower):
                hours = 2
            elif re.search(r'полчаса', text_lower):
                return "0:30:00"
            elif re.search(r'целый\s+день', text_lower):
                hours = 8
        return f"{hours}:00:00" if hours > 0 else "-"
    
    def extract_stages(self, text: str) -> List[str]:
        """Извлечение этапов"""
        stages = re.findall(r'^\s*([0-9]+[.)])\s*([^\n]+)$', text, re.MULTILINE)
        if stages:
            return [stage[1].strip() for stage in stages[:5]]
        return []
