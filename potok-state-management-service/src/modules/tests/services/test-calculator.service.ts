import { Injectable, Logger } from '@nestjs/common';

export interface TestAnswers {
  q1: number;
  q2: number;
  q3: number;
}

export interface TestResult {
  score: number;
  interpretation: string;
  details: {
    q1: number;
    q2: number;
    q3: number;
    formula: string;
  };
}

@Injectable()
export class TestCalculatorService {
  private readonly logger = new Logger(TestCalculatorService.name);

  /**
   * Расчет Energy Score
   * Формула: Energy = (Q1 + Q2 + Q3) / 3
   * Диапазон: 0-10
   */
  calculateEnergyScore(answers: TestAnswers): TestResult {
    const score = (answers.q1 + answers.q2 + answers.q3) / 3;
    const roundedScore = Number(score.toFixed(1));

    return {
      score: roundedScore,
      interpretation: this.getEnergyInterpretation(roundedScore),
      details: {
        q1: answers.q1,
        q2: answers.q2,
        q3: answers.q3,
        formula: `(${answers.q1} + ${answers.q2} + ${answers.q3}) / 3 = ${roundedScore}`,
      },
    };
  }

  /**
   * Расчет Focus Score
   * Формула: Focus = (Q1 + Q2 + Q3) / 3
   * Диапазон: 0-100
   */
  calculateFocusScore(answers: TestAnswers): TestResult {
    const score = (answers.q1 + answers.q2 + answers.q3) / 3;
    const roundedScore = Math.round(score);

    return {
      score: roundedScore,
      interpretation: this.getFocusInterpretation(roundedScore),
      details: {
        q1: answers.q1,
        q2: answers.q2,
        q3: answers.q3,
        formula: `(${answers.q1} + ${answers.q2} + ${answers.q3}) / 3 = ${roundedScore}`,
      },
    };
  }

  /**
   * Расчет Motivation Score
   * Формула: Motivation = (Q1 + Q2 + Q3) / 3
   * Диапазон: 0-10
   */
  calculateMotivationScore(answers: TestAnswers): TestResult {
    const score = (answers.q1 + answers.q2 + answers.q3) / 3;
    const roundedScore = Number(score.toFixed(1));

    return {
      score: roundedScore,
      interpretation: this.getMotivationInterpretation(roundedScore),
      details: {
        q1: answers.q1,
        q2: answers.q2,
        q3: answers.q3,
        formula: `(${answers.q1} + ${answers.q2} + ${answers.q3}) / 3 = ${roundedScore}`,
      },
    };
  }

  /**
   * Расчет Stress Score
   * Формула: Stress = (Q1 + Q2 + Q3) / 3
   * Диапазон: 0-10
   */
  calculateStressScore(answers: TestAnswers): TestResult {
    const score = (answers.q1 + answers.q2 + answers.q3) / 3;
    const roundedScore = Number(score.toFixed(1));

    return {
      score: roundedScore,
      interpretation: this.getStressInterpretation(roundedScore),
      details: {
        q1: answers.q1,
        q2: answers.q2,
        q3: answers.q3,
        formula: `(${answers.q1} + ${answers.q2} + ${answers.q3}) / 3 = ${roundedScore}`,
      },
    };
  }

  // ==================== Интерпретации ====================

  private getEnergyInterpretation(score: number): string {
    if (score <= 3) return 'Критически низкая энергия — необходим отдых';
    if (score <= 5) return 'Низкая энергия — рекомендуются легкие задачи';
    if (score <= 7) return 'Умеренная энергия — подходит для обычных задач';
    if (score <= 9) return 'Хорошая энергия — можно браться за сложные задачи';
    return 'Отличная энергия — идеально для самых важных задач';
  }

  private getFocusInterpretation(score: number): string {
    if (score <= 30) return 'Критически низкий фокус — избегайте сложных задач';
    if (score <= 50) return 'Низкий фокус — подходят только простые задачи';
    if (score <= 70) return 'Умеренный фокус — можно работать над обычными задачами';
    if (score <= 85) return 'Хороший фокус — подходит для большинства задач';
    return 'Отличный фокус — идеально для задач требующих концентрации';
  }

  private getMotivationInterpretation(score: number): string {
    if (score <= 3) return 'Критически низкая мотивация — нужен перерыв';
    if (score <= 5) return 'Низкая мотивация — выполняйте легкие задачи';
    if (score <= 7) return 'Умеренная мотивация — нормальный рабочий режим';
    if (score <= 9) return 'Хорошая мотивация — отличное время для продуктивной работы';
    return 'Отличная мотивация — используйте это время максимально';
  }

  private getStressInterpretation(score: number): string {
    if (score <= 2) return 'Минимальный стресс — отличное состояние';
    if (score <= 4) return 'Низкий стресс — нормальный уровень';
    if (score <= 6) return 'Умеренный стресс — следите за состоянием';
    if (score <= 8) return 'Высокий стресс — рекомендуются техники релаксации';
    return 'Критический стресс — необходим отдых и восстановление';
  }
}
