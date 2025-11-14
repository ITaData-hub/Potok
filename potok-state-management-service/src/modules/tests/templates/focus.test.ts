import { TestStructure } from '../../../common/interfaces/test-structure.interface';

export const FOCUS_TEST: TestStructure = {
  test_type: 'focus',
  time_window: {
    start: '12:00',
    end: '13:00',
  },
  questions: [
    {
      id: 1,
      prompt: 'Сколько раз отвлекались?',
      type: 'interruption_tracker',
      scale: [
        { value: 3, emoji: '🎯', label: '0-1 раз (отлично)' },
        { value: 2, emoji: '😐', label: '2-5 раз (нормально)' },
        { value: 1, emoji: '😵', label: 'Больше 5 раз' },
      ],
      weight: 0.4,
    },
    {
      id: 2,
      prompt: 'Сколько задач завершено с утра?',
      type: 'completion_tracker',
      scale: [
        { value: 1, emoji: '❌', label: 'Ничего не завершил' },
        { value: 2, emoji: '✅', label: 'Частично завершил' },
        { value: 3, emoji: '🏆', label: 'Завершил всё плановое' },
      ],
      weight: 0.4,
    },
    {
      id: 3,
      prompt: 'Длительность перерывов?',
      type: 'break_tracking',
      scale: [
        { value: 1, label: 'Меньше 15 минут' },
        { value: 2, label: '15-45 минут' },
        { value: 3, label: 'Больше 45 минут' },
      ],
      weight: 0.2,
    },
  ],
  estimated_duration: 90,
};
