// src/modules/bot/handlers/ml-task-generation.handler.ts
import { Injectable, Logger } from '@nestjs/common';
import { MessageSender } from '../services/message-sender.service';
import { UserManager } from '../services/user-manager.service';
import { MlServiceClient } from '../services/ml-service-client.service';
import { ServiceIntegration } from '../services/service-integration.service';
import { InlineKeyboard } from '../bot.service';
import { MLPredictionResponse } from '../types/ml-service.types';

interface TaskDraftML {
  originalText: string; // Исходное сообщение пользователя
  mlPrediction?: MLPredictionResponse; // Результат предсказания ML
  title?: string;
  description?: string;
  priority?: string;
  complexity?: string;
  deadline?: string;
  estimated_duration?: number;
  required_energy?: number;
  required_focus?: number;
  category?: string[];
  currentEditField?: string; // Какое поле сейчас редактируем
}

@Injectable()
export class MlTaskGenerationHandler {
  private readonly logger = new Logger(MlTaskGenerationHandler.name);

  private drafts = new Map<string, TaskDraftML>();

  constructor(
    private readonly messageSender: MessageSender,
    private readonly userManager: UserManager,
    private readonly mlService: MlServiceClient,
    private readonly serviceIntegration: ServiceIntegration,
  ) {}

  /**
   * Обработка callback от пользователя
   */
  async handleCallback(maxUserId: string, params: string[]): Promise<void> {
    const action = params[0];

    switch (action) {
      case 'start':
        await this.startMlGeneration(maxUserId);
        break;
      case 'accept':
        await this.acceptGeneration(maxUserId);
        break;
      case 'edit_field':
        await this.startEditField(maxUserId, params[1]);
        break;
      case 'confirm_save':
        await this.confirmAndSave(maxUserId);
        break;
      case 'cancel':
        await this.cancelGeneration(maxUserId);
        break;
      default:
        this.logger.warn(`Unknown ML action: ${action}`);
    }
  }


  /**
   * Старт процесса генерации с ML
   */
  async startMlGeneration(maxUserId: string): Promise<void> {
    const text = `
🤖 **Генерация задачи с помощью нейросети**

Отправьте описание задачи одним сообщением.

**Пример:**
\`Сделать презентацию к пятнице, высокий приоритет\`
\`Переделать весь сайт, 8 часов работы\`

После генерации вы сможете отредактировать любые поля.
    `;

    const keyboard: InlineKeyboard = {
      type: 'inline_keyboard',
      payload: {
        buttons: [[{ type: 'callback', text: '❌ Отмена', payload: 'ml_gen:cancel' }]],
      },
    };

    await this.messageSender.showScreen(maxUserId, text, keyboard);
    await this.userManager.setUserState(maxUserId, 'awaiting_ml_task_input');
  }

  /**
   * Обработка текста для генерации
   */
  async handleTaskInput(maxUserId: string, text: string): Promise<void> {
    await this.messageSender.showScreen(
      maxUserId,
      '⏳ Генерирую задачу с помощью нейросети...',
    );

    try {
      // Вызов ML-сервиса
      const prediction = await this.mlService.predict(text);

      // Сохранение черновика
      const draft: TaskDraftML = {
        originalText: text,
        mlPrediction: prediction,
        title: prediction.name,
        description: prediction.description === '-' ? '' : prediction.description,
        priority: this.mapPriorityFromML(prediction.priority),
        complexity: this.mapComplexityFromML(prediction.difficulty) || "",
        deadline: prediction.deadline || "",
        estimated_duration: this.parseExecutionTime(prediction.execution_time),
        category: prediction.category,
      };

      // Автоматически устанавливаем энергию и фокус на основе сложности
      draft.required_energy = this.calculateEnergy(draft.complexity || "");
      draft.required_focus = this.calculateFocus(draft.complexity || "");

      await this.saveDraft(maxUserId, draft);
      await this.userManager.clearUserState(maxUserId);

      // Показываем результат генерации
      await this.showGenerationResult(maxUserId, draft);
    } catch (error) {
      this.logger.error(`Ошибка генерации с ML: ${error.message}`);
      await this.messageSender.showScreen(
        maxUserId,
        `❌ **Ошибка генерации задачи**\n\nML-сервис недоступен или произошла ошибка.\n\nПопробуйте еще раз или создайте задачу вручную.`,
      );
      await this.userManager.clearUserState(maxUserId);
    }
  }

  /**
   * Показать результат генерации
   */
  private async showGenerationResult(
    maxUserId: string,
    draft: TaskDraftML,
  ): Promise<void> {
    const confidence = draft.mlPrediction?.confidence || 0;
    const confidencePercent = (confidence * 100).toFixed(0);

    const text = `
🔍 **Задача сгенерирована** (уверенность: ${confidencePercent}%)

📝 **Название:** ${draft.title || 'Не указано'}
📄 **Описание:** ${draft.description || 'Отсутствует'}
${this.getPriorityEmoji(draft.priority || "")} **Приоритет:** ${this.getPriorityText(draft.priority || "")}
${this.getComplexityEmoji(draft.complexity || "")} **Сложность:** ${this.getComplexityText(draft.complexity || "")}
${draft.deadline ? `⏰ **Дедлайн:** ${this.formatDate(new Date(draft.deadline))}` : '⏰ **Дедлайн:** Не установлен'}
⏱️ **Время выполнения:** ${draft.estimated_duration || 60} минут
📂 **Категории:** ${draft.category?.join(', ') || 'Без категории'}

Вы можете принять задачу как есть или отредактировать любые поля.
    `;

    const keyboard: InlineKeyboard = {
      type: 'inline_keyboard',
      payload: {
        buttons: [
          [{ type: 'callback', text: '✅ Принять и сохранить', payload: 'ml_gen:accept' }],
          [
            {
              type: 'callback',
              text: '✏️ Изменить название',
              payload: 'ml_gen:edit_field:title',
            },
            {
              type: 'callback',
              text: '✏️ Изменить описание',
              payload: 'ml_gen:edit_field:description',
            },
          ],
          [
            {
              type: 'callback',
              text: '📊 Изменить приоритет',
              payload: 'ml_gen:edit_field:priority',
            },
            {
              type: 'callback',
              text: '🔥 Изменить сложность',
              payload: 'ml_gen:edit_field:complexity',
            },
          ],
          [
            {
              type: 'callback',
              text: '⏰ Изменить дедлайн',
              payload: 'ml_gen:edit_field:deadline',
            },
            {
              type: 'callback',
              text: '⏱️ Изменить время',
              payload: 'ml_gen:edit_field:duration',
            },
          ],
          [{ type: 'callback', text: '❌ Отменить', payload: 'ml_gen:cancel' }],
        ],
      },
    };

    await this.messageSender.showScreen(maxUserId, text, keyboard);
  }

  /**
   * Начать редактирование поля
   */
  private async startEditField(maxUserId: string, field: string): Promise<void> {
    const draft = await this.getDraft(maxUserId);
    draft.currentEditField = field;
    await this.saveDraft(maxUserId, draft);

    let message = '';
    let keyboard: InlineKeyboard | undefined;

    switch (field) {
      case 'title':
        message = '✏️ **Изменение названия**\n\nОтправьте новое название задачи:';
        await this.userManager.setUserState(maxUserId, 'ml_editing_title');
        break;

      case 'description':
        message = '✏️ **Изменение описания**\n\nОтправьте новое описание задачи:';
        await this.userManager.setUserState(maxUserId, 'ml_editing_description');
        break;

      case 'priority':
        message = '📊 **Выберите новый приоритет:**';
        keyboard = {
          type: 'inline_keyboard',
          payload: {
            buttons: [
              [
                { type: 'callback', text: '🔴 Высокий', payload: 'ml_gen:set:priority:high' },
                { type: 'callback', text: '🟡 Средний', payload: 'ml_gen:set:priority:medium' },
                { type: 'callback', text: '🟢 Низкий', payload: 'ml_gen:set:priority:low' },
              ],
              [{ type: 'callback', text: '🔙 Назад', payload: 'ml_gen:show_result' }],
            ],
          },
        };
        break;

      case 'complexity':
        message = '🔥 **Выберите новую сложность:**';
        keyboard = {
          type: 'inline_keyboard',
          payload: {
            buttons: [
              [
                {
                  type: 'callback',
                  text: '🔥 Высокая',
                  payload: 'ml_gen:set:complexity:high',
                },
                {
                  type: 'callback',
                  text: '⚡ Средняя',
                  payload: 'ml_gen:set:complexity:medium',
                },
                { type: 'callback', text: '✨ Низкая', payload: 'ml_gen:set:complexity:low' },
              ],
              [{ type: 'callback', text: '🔙 Назад', payload: 'ml_gen:show_result' }],
            ],
          },
        };
        break;

      case 'deadline':
        message =
          '⏰ **Изменение дедлайна**\n\nОтправьте дату в формате `ДД.ММ.ГГГГ`\nНапример: `15.11.2025`';
        keyboard = {
          type: 'inline_keyboard',
          payload: {
            buttons: [
              [
                {
                  type: 'callback',
                  text: '📅 Завтра',
                  payload: 'ml_gen:set:deadline:tomorrow',
                },
                {
                  type: 'callback',
                  text: '📅 Через неделю',
                  payload: 'ml_gen:set:deadline:week',
                },
              ],
              [{ type: 'callback', text: '🔙 Назад', payload: 'ml_gen:show_result' }],
            ],
          },
        };
        await this.userManager.setUserState(maxUserId, 'ml_editing_deadline');
        break;

      case 'duration':
        message = '⏱️ **Выберите время выполнения:**';
        keyboard = {
          type: 'inline_keyboard',
          payload: {
            buttons: [
              [
                { type: 'callback', text: '15 мин', payload: 'ml_gen:set:duration:15' },
                { type: 'callback', text: '30 мин', payload: 'ml_gen:set:duration:30' },
                { type: 'callback', text: '60 мин', payload: 'ml_gen:set:duration:60' },
              ],
              [
                { type: 'callback', text: '2 часа', payload: 'ml_gen:set:duration:120' },
                { type: 'callback', text: '4 часа', payload: 'ml_gen:set:duration:240' },
              ],
              [{ type: 'callback', text: '🔙 Назад', payload: 'ml_gen:show_result' }],
            ],
          },
        };
        break;
    }

    if (keyboard) {
      await this.messageSender.showScreen(maxUserId, message, keyboard);
    } else {
      await this.messageSender.showScreen(maxUserId, message);
    }
  }

  /**
   * Обработка установки значения через callback
   */
  async handleSetValue(maxUserId: string, params: string[]): Promise<void> {
    const field = params[0];
    const value = params[1];

    const draft = await this.getDraft(maxUserId);

    switch (field) {
      case 'priority':
        draft.priority = value;
        break;
      case 'complexity':
        draft.complexity = value;
        draft.required_energy = this.calculateEnergy(value);
        draft.required_focus = this.calculateFocus(value);
        break;
      case 'deadline':
        if (value === 'tomorrow') {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          draft.deadline = tomorrow.toISOString();
        } else if (value === 'week') {
          const nextWeek = new Date();
          nextWeek.setDate(nextWeek.getDate() + 7);
          draft.deadline = nextWeek.toISOString();
        }
        break;
      case 'duration':
        draft.estimated_duration = parseInt(value, 10);
        break;
    }

    await this.saveDraft(maxUserId, draft);
    await this.showGenerationResult(maxUserId, draft);
  }

  /**
   * Обработка текстовых изменений
   */
  async handleTextEdit(maxUserId: string, text: string, field: string): Promise<void> {
    const draft = await this.getDraft(maxUserId);

    switch (field) {
      case 'title':
        draft.title = text;
        break;
      case 'description':
        draft.description = text;
        break;
      case 'deadline':
        const parsedDate = this.parseDate(text);
        if (!parsedDate) {
          await this.messageSender.showScreen(
            maxUserId,
            '❌ Неверный формат даты. Используйте `ДД.ММ.ГГГГ`',
          );
          return;
        }
        draft.deadline = parsedDate.toISOString();
        break;
    }

    await this.saveDraft(maxUserId, draft);
    await this.userManager.clearUserState(maxUserId);
    await this.showGenerationResult(maxUserId, draft);
  }

  /**
   * Принять и сохранить задачу
   */
  private async acceptGeneration(maxUserId: string): Promise<void> {
    await this.confirmAndSave(maxUserId);
  }

  /**
   * Сохранить задачу и отправить на дообучение
   */
  private async confirmAndSave(maxUserId: string): Promise<void> {
    const user = await this.userManager.getUserByMaxId(maxUserId);
    if (!user) return;

    const draft = await this.getDraft(maxUserId);

    try {
      // Создаём задачу
      await this.serviceIntegration.createTask(user.id, {
        title: draft.title?.trim(),
        description: draft.description || '',
        priority: draft.priority || 'medium',
        complexity: draft.complexity || 'medium',
        
        // ← ИСПРАВЛЕНИЕ: преобразовать пустую строку в null
        deadline: draft.deadline && draft.deadline.trim() 
          ? draft.deadline 
          : null,
        
        estimated_duration: draft.estimated_duration || 60,
        required_energy: draft.required_energy || 6,
        required_focus: draft.required_focus || 60,
      });

      // Отправляем данные на дообучение ML
      await this.sendToFineTune(draft);

      await this.clearDraft(maxUserId);

      const keyboard: InlineKeyboard = {
        type: 'inline_keyboard',
        payload: {
          buttons: [
            [
              { type: 'callback', text: '➕ Добавить еще', payload: 'task:add' },
              { type: 'callback', text: '📋 Мои задачи', payload: 'task:list' },
            ],
            [{ type: 'callback', text: '↩️ Главное меню', payload: 'menu:main' }],
          ],
        },
      };

      await this.messageSender.showScreen(
        maxUserId,
        '✅ **Задача успешно создана и отправлена на обучение модели!**',
        keyboard,
      );
    } catch (error) {
      this.logger.error(`Ошибка при сохранении задачи: ${error.message}`);
      await this.messageSender.showScreen(
        maxUserId,
        '❌ Ошибка при создании задачи. Попробуйте позже.',
      );
    }
  }

  /**
   * Отправка данных для дообучения ML
   */
  private async sendToFineTune(draft: TaskDraftML): Promise<void> {
    try {
      const trainingExample = {
        text: draft.originalText,
        labels: {
          name: draft.title || 'Без названия',
          description: draft.description || '-',
          priority: this.mapPriorityToML(draft.priority || ""),
          deadline: draft.deadline || null,
          execution_time: draft.estimated_duration
            ? this.formatExecutionTime(draft.estimated_duration)
            : '-',
          category: draft.category || [],
          difficulty: this.mapComplexityToML(draft.complexity || ""),
          stages: [],
          status: 'новая',
        },
      };

      await this.mlService.fineTune({
        training_examples: [trainingExample],
        epochs: 10,
        batch_size: 16,
        learning_rate: 0.0001,
        freeze_embedding: true,
      });

      this.logger.log('✅ Данные отправлены на дообучение ML-модели');
    } catch (error) {
      this.logger.error(`⚠️ Не удалось отправить данные на дообучение: ${error.message}`);
      // Не падаем, если дообучение не удалось
    }
  }

  /**
   * Отмена генерации
   */
  private async cancelGeneration(maxUserId: string): Promise<void> {
    await this.clearDraft(maxUserId);
    await this.userManager.clearUserState(maxUserId);

    const keyboard: InlineKeyboard = {
      type: 'inline_keyboard',
      payload: {
        buttons: [[{ type: 'callback', text: '↩️ Главное меню', payload: 'menu:main' }]],
      },
    };

    await this.messageSender.showScreen(
      maxUserId,
      '❌ Генерация задачи отменена.',
      keyboard,
    );
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private async saveDraft(maxUserId: string, draft: TaskDraftML): Promise<void> {
    // Сохранить в память
    this.drafts.set(maxUserId, draft);
    
    // Также сохранить в state как fallback
    await this.userManager.setUserState(
      maxUserId,
      JSON.stringify({ state: 'ml_task_draft', data: draft }),
      3600,
    );
  }

  private async getDraft(maxUserId: string): Promise<TaskDraftML> {
    // Сначала попробовать получить из памяти
    const memoryDraft = this.drafts.get(maxUserId);
    if (memoryDraft) {
      this.logger.debug('Draft получен из памяти');
      return memoryDraft;
    }

    // Fallback к state
    const stateStr = await this.userManager.getUserState(maxUserId);
    if (!stateStr) return {} as TaskDraftML;

    try {
      const state = JSON.parse(stateStr);
      return state.data || ({} as TaskDraftML);
    } catch {
      return {} as TaskDraftML;
    }
  }

  private async clearDraft(maxUserId: string): Promise<void> {
    this.drafts.delete(maxUserId);
    await this.userManager.clearUserState(maxUserId);
  }

  private mapPriorityFromML(mlPriority: number): string {
    if (mlPriority >= 4) return 'high';
    if (mlPriority >= 3) return 'medium';
    return 'low';
  }

  private mapPriorityToML(priority: string): number {
    const map = { high: 5, medium: 3, low: 1 };
    return map[priority] || 3;
  }

  private mapComplexityFromML(mlDifficulty: number): string {
    if (mlDifficulty >= 7) return 'high';
    if (mlDifficulty >= 4) return 'medium';
    return 'low';
  }

  private mapComplexityToML(complexity: string): number {
    const map = { high: 8, medium: 5, low: 2 };
    return map[complexity] || 5;
  }

  private parseExecutionTime(executionTime: string): number | undefined {
    if (!executionTime || executionTime === '-') return undefined;
    
    // Формат: "8:00:00" -> 480 минут
    const parts = executionTime.split(':');
    if (parts.length === 3) {
      const hours = parseInt(parts[0], 10);
      const minutes = parseInt(parts[1], 10);
      return hours * 60 + minutes;
    }
    return undefined;
  }

  private formatExecutionTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}:${mins.toString().padStart(2, '0')}:00`;
  }

  private calculateEnergy(complexity: string): number {
    const map = { high: 8, medium: 6, low: 4 };
    return map[complexity] || 6;
  }

  private calculateFocus(complexity: string): number {
    const map = { high: 80, medium: 60, low: 40 };
    return map[complexity] || 60;
  }

  private getPriorityEmoji(priority: string): string {
    const map = { high: '🔴', medium: '🟡', low: '🟢' };
    return map[priority] || '🟡';
  }

  private getPriorityText(priority: string): string {
    const map = { high: 'Высокий', medium: 'Средний', low: 'Низкий' };
    return map[priority] || 'Средний';
  }

  private getComplexityEmoji(complexity: string): string {
    const map = { high: '🔥', medium: '⚡', low: '✨' };
    return map[complexity] || '⚡';
  }

  private getComplexityText(complexity: string): string {
    const map = { high: 'Высокая', medium: 'Средняя', low: 'Низкая' };
    return map[complexity] || 'Средняя';
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString('ru-RU');
  }

  private parseDate(text: string): Date | null {
    const regex = /^(\d{2})\.(\d{2})\.(\d{4})$/;
    const match = text.match(regex);

    if (!match) return null;

    const [, day, month, year] = match;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }
}
