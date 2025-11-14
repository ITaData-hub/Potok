// src/modules/bot/utils/keyboard.builder.ts

/**
 * Утилита для создания клавиатур в формате MAX Bot API
 * Использует KeyboardBuilder из @maxhub/max-bot-api
 */

export class MaxKeyboard {
    /**
     * Создание inline-клавиатуры
     * 
     * Лимиты:
     * - До 210 кнопок всего
     * - До 30 рядов
     * - До 7 кнопок в ряду (до 3 для специальных типов)
     */
    static inlineKeyboard(buttons: MaxInlineButton[][]): any {
      return {
        type: 'inline_keyboard',
        buttons: buttons,
      };
    }
  
    /**
     * Создание reply-клавиатуры
     */
    static replyKeyboard(
      buttons: MaxReplyButton[][],
      options?: { resize?: boolean; once?: boolean; persistent?: boolean },
    ): any {
      return {
        type: 'keyboard',
        buttons: buttons,
        resize: options?.resize ?? true,
        once: options?.once ?? false,
        persistent: options?.persistent ?? false,
      };
    }
  
    /**
     * Удаление клавиатуры
     */
    static removeKeyboard(): any {
      return {
        type: 'remove_keyboard',
      };
    }
  }
  
  /**
   * Билдер для создания кнопок
   */
  export class MaxButton {
    /**
     * Callback кнопка (для inline-клавиатуры)
     */
    static callback(
      text: string,
      payload: string,
      options?: { intent?: 'default' | 'positive' | 'negative' | 'primary' },
    ): MaxInlineButton {
      return {
        type: 'callback',
        text,
        payload,
        intent: options?.intent || 'default',
      };
    }
  
    /**
     * Кнопка-ссылка (для inline-клавиатуры)
     */
    static link(text: string, url: string): MaxInlineButton {
      return {
        type: 'link',
        text,
        url,
      };
    }
  
    /**
     * Кнопка запроса контакта
     */
    static requestContact(text: string): MaxInlineButton {
      return {
        type: 'request_contact',
        text,
      };
    }
  
    /**
     * Кнопка запроса геолокации
     */
    static requestGeoLocation(text: string, quick?: boolean): MaxInlineButton {
      return {
        type: 'request_geo_location',
        text,
        quick,
      };
    }
  
    /**
     * Кнопка открытия мини-приложения
     */
    static openApp(text: string, appId: string, contactId?: number): MaxInlineButton {
      return {
        type: 'open_app',
        text,
        app_id: appId,
        contact_id: contactId,
      };
    }
  
    /**
     * Кнопка отправки сообщения
     */
    static message(text: string): MaxInlineButton {
      return {
        type: 'message',
        text,
      };
    }
  
    /**
     * Простая кнопка для reply-клавиатуры
     */
    static default(text: string): MaxReplyButton {
      return {
        type: 'default',
        text,
      };
    }
  }
  
  // Типы для кнопок
  export interface MaxInlineButton {
    type: 'callback' | 'link' | 'request_contact' | 'request_geo_location' | 'open_app' | 'message';
    text: string;
    payload?: string;
    intent?: 'default' | 'positive' | 'negative' | 'primary';
    url?: string;
    app_id?: string;
    contact_id?: number;
    quick?: boolean;
  }
  
  export interface MaxReplyButton {
    type: 'default' | 'request_contact' | 'request_geo_location';
    text: string;
  }
  