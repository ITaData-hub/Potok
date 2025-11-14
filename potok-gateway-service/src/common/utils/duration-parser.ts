/**
 * Парсер длительности задач
 * Поддерживает форматы:
 * - "30м", "2ч", "3д", "1н", "2мес"
 * - "30 минут", "2 часа", "3 дня", "1 неделя"
 * - Числа (по умолчанию в минутах): "60" = 60 минут
 */
export class DurationParser {
    /**
     * Парсит строку длительности в минуты
     * @param input - строка вида "30м", "2ч", "3д", "1н", "2мес"
     * @returns длительность в минутах
     */
    static parse(input: string): number | null {
      if (!input || typeof input !== 'string') {
        return null;
      }
  
      const trimmed = input.trim().toLowerCase();
  
      // Если только число - считаем минутами
      if (/^\d+$/.test(trimmed)) {
        return parseInt(trimmed, 10);
      }
  
      // Паттерны для разных единиц времени
      const patterns = [
        // Минуты
        { regex: /^(\d+)\s*(м|мин|минут|минуты|minutes?|min|m)$/i, multiplier: 1 },
        // Часы
        { regex: /^(\d+)\s*(ч|час|часа|часов|hours?|h)$/i, multiplier: 60 },
        // Дни
        { regex: /^(\d+)\s*(д|день|дня|дней|days?|d)$/i, multiplier: 1440 }, // 24*60
        // Недели
        { regex: /^(\d+)\s*(н|нед|недел|недели|неделя|weeks?|w)$/i, multiplier: 10080 }, // 7*24*60
        // Месяцы (30 дней)
        { regex: /^(\d+)\s*(мес|месяц|месяца|месяцев|months?|mo)$/i, multiplier: 43200 }, // 30*24*60
      ];
  
      for (const pattern of patterns) {
        const match = trimmed.match(pattern.regex);
        if (match) {
          const value = parseInt(match[1], 10);
          return value * pattern.multiplier;
        }
      }
  
      return null;
    }
  
    /**
     * Форматирует минуты в читаемую строку
     * @param minutes - длительность в минутах
     * @returns строка вида "2ч 30м", "3д", "1 месяц"
     */
    static format(minutes: number): string {
      if (minutes < 60) {
        return `${minutes}м`;
      } else if (minutes < 1440) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hours}ч ${mins}м` : `${hours}ч`;
      } else if (minutes < 10080) {
        const days = Math.floor(minutes / 1440);
        const hours = Math.floor((minutes % 1440) / 60);
        return hours > 0 ? `${days}д ${hours}ч` : `${days}д`;
      } else if (minutes < 43200) {
        const weeks = Math.floor(minutes / 10080);
        const days = Math.floor((minutes % 10080) / 1440);
        return days > 0 ? `${weeks}н ${days}д` : `${weeks}н`;
      } else {
        const months = Math.floor(minutes / 43200);
        const days = Math.floor((minutes % 43200) / 1440);
        return days > 0 ? `${months} мес ${days}д` : `${months} мес`;
      }
    }
  
    /**
     * Валидация строки длительности
     * @param input - строка для проверки
     * @returns true если валидна, иначе false
     */
    static isValid(input: string): boolean {
      return this.parse(input) !== null;
    }
  
    /**
     * Получить подсказки для пользователя
     */
    static getHints(): string {
      return `
  Примеры:
  • 30м или 30 минут
  • 2ч или 2 часа
  • 3д или 3 дня
  • 1н или 1 неделя
  • 2мес или 2 месяца
  • Или просто число (минуты): 60
      `.trim();
    }
  }
  