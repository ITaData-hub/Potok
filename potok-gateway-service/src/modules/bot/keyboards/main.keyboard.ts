export class MainKeyboard {
    /**
     * Главное меню
     */
    static getMainMenu() {
      return {
        inline_keyboard: [
          [
            { text: '⚡ Пройти тест', callback_data: 'test:menu' },
            { text: '🎯 MIT', callback_data: 'mit:show' },
          ],
          [
            { text: '📋 Мои задачи', callback_data: 'task:list' },
            { text: '➕ Добавить задачу', callback_data: 'task:add' },
          ],
          [
            { text: '📊 Статистика', callback_data: 'stats:show:today' },
            { text: '⚙️ Настройки', callback_data: 'settings:show' },
          ],
          [{ text: 'ℹ️ Помощь', callback_data: 'help:show' }],
        ],
      };
    }
  
    /**
     * Меню тестов
     */
    static getTestMenu() {
      return {
        inline_keyboard: [
          [
            { text: '💪 Энергия', callback_data: 'test:energy:start' },
            { text: '🎯 Фокус', callback_data: 'test:focus:start' },
          ],
          [
            { text: '🔥 Мотивация', callback_data: 'test:motivation:start' },
            { text: '😌 Стресс', callback_data: 'test:stress:start' },
          ],
          [{ text: '🔙 Главное меню', callback_data: 'menu:main' }],
        ],
      };
    }
  }
  