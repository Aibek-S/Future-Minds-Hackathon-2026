import { Injectable } from '@nestjs/common';
import { MistakeType } from '@prisma/client';

export type MockAnswerCheck = {
  correct: boolean;
  feedback: string;
  mistakeType: MistakeType | null;
};

@Injectable()
export class MockAnswerCheckerService {
  /** Temporary deterministic checker until Task.correctAnswer exists. */
  evaluate(answer: string): MockAnswerCheck {
    const correct = /^(correct|правильно)$/i.test(answer.trim());
    if (correct) {
      return {
        correct: true,
        feedback: 'Верно! Ответ принят в demo-режиме.',
        mistakeType: null,
      };
    }

    return {
      correct: false,
      feedback: 'Ответ отмечен как ошибка. Попробуй разобрать шаги решения.',
      mistakeType: this.classifyMistake(answer),
    };
  }

  private classifyMistake(answer: string): MistakeType {
    const normalized = answer.trim().toLowerCase();
    if (!normalized || /не знаю|не понял|услови|dont know|don't know|unknown/.test(normalized)) {
      return MistakeType.READING_ERROR;
    }
    if (/формул|теорем|правил|понят/.test(normalized)) {
      return MistakeType.CONCEPTUAL_ERROR;
    }
    return MistakeType.CALCULATION_ERROR;
  }
}
