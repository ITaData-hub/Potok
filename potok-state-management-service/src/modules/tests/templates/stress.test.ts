import { TestStructure } from '../../../common/interfaces/test-structure.interface';

export const STRESS_TEST: TestStructure = {
  test_type: 'stress',
  time_window: {
    start: '18:00',
    end: '19:00',
  },
  questions: [
    {
      id: 1,
      prompt: 'Чувствуете ли напряжение в теле?',
      type: 'physical_tension',
      scale: [
        { value: 3, emoji: '😌', label: 'Расслаблен, всё ок' },
        { value: 2, emoji: '😐', label: 'Есть легкое напряжение' },
        { value: 1, emoji: '😫', label: 'Сильное напряжение' },
      ],
      weight: 0.35,
    },
    {
      id: 2,
      prompt: 'Крутятся ли мысли в голове?',
      type: 'mental_rumination',
      scale: [
        { value: 3, emoji: '🧘', label: 'Спокоен, мысли под контролем' },
        { value: 2, emoji: '🤔', label: 'Иногда прокручиваю' },
        { value: 1, emoji: '🌀', label: 'Постоянно думаю о работе' },
      ],
      weight: 0.35,
    },
    {
      id: 3,
      prompt: 'Всё ли завершено на сегодня?',
      type: 'open_loops_closure',
      scale: [
        { value: 3, emoji: '✅', label: 'Да, всё закрыто' },
        { value: 2, emoji: '📝', label: 'Есть пара незавершенок' },
        { value: 1, emoji: '⚠️', label: 'Много открытых задач' },
      ],
      weight: 0.3,
    },
  ],
  estimated_duration: 90,
};
