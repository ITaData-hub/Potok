import { TestStructure } from '../../../common/interfaces/test-structure.interface';

export const MOTIVATION_TEST: TestStructure = {
  test_type: 'motivation',
  time_window: {
    start: '15:00',
    end: '15:30',
  },
  questions: [
    {
      id: 1,
      prompt: 'Хочется ли продолжать работать?',
      type: 'intrinsic_motivation',
      scale: [
        { value: 1, emoji: '😩', label: 'Нет желания' },
        { value: 2, emoji: '😐', label: 'Нейтрально' },
        { value: 3, emoji: '🔥', label: 'Есть драйв' },
      ],
      weight: 0.35,
    },
    {
      id: 2,
      prompt: 'Сколько достигнуто за день?',
      type: 'progress_indicator',
      scale: [
        { value: 1, emoji: '📉', label: 'Почти ничего' },
        { value: 2, emoji: '📊', label: '1-2 задачи' },
        { value: 3, emoji: '📈', label: '3+ задачи' },
      ],
      weight: 0.35,
    },
    {
      id: 3,
      prompt: 'Понимаете ли зачем это делаете?',
      type: 'purpose_clarity',
      scale: [
        { value: 1, emoji: '❓', label: 'Непонятно зачем' },
        { value: 2, emoji: '🤔', label: 'Есть идея' },
        { value: 3, emoji: '🎯', label: 'Четко понимаю цель' },
      ],
      weight: 0.3,
    },
  ],
  estimated_duration: 90,
};
