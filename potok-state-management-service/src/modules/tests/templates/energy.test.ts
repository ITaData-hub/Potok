import { TestStructure } from '../../../common/interfaces/test-structure.interface';

export const ENERGY_TEST: TestStructure = {
  test_type: 'energy',
  time_window: {
    start: '08:00',
    end: '09:00',
  },
  questions: [
    {
      id: 1,
      prompt: 'Как вы встали сегодня утром?',
      type: 'behavior_based',
      scale: [
        { value: 1, emoji: '😴', label: 'Несколько раз откладывал будильник' },
        { value: 2, emoji: '😐', label: 'Встал со второго раза' },
        { value: 3, emoji: '💪', label: 'Встал сразу после будильника' },
      ],
      weight: 0.4,
    },
    {
      id: 2,
      prompt: 'Как быстро вы собрались?',
      type: 'speed_indicator',
      scale: [
        { value: 1, emoji: '🐌', label: 'Медленно, долго думал' },
        { value: 2, emoji: '😊', label: 'Нормально, в своем темпе' },
        { value: 3, emoji: '⚡', label: 'Быстро, энергично' },
      ],
      weight: 0.35,
    },
    {
      id: 3,
      prompt: 'Насколько ясно мышление?',
      type: 'clarity_indicator',
      scale: [
        { value: 1, emoji: '🌫️', label: 'Туман в голове' },
        { value: 2, emoji: '☁️', label: 'Немного размыто' },
        { value: 3, emoji: '☀️', label: 'Ясно и четко' },
      ],
      weight: 0.25,
    },
  ],
  estimated_duration: 90,
};
