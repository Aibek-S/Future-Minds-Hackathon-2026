import { Injectable } from '@nestjs/common';
import { MistakeType } from '@prisma/client';

export type AnswerCheck = {
  correct: boolean;
  feedback: string;
  mistakeType: MistakeType | null;
};

const ANSWER_SEPARATOR = '|';

@Injectable()
export class AnswerCheckerService {
  /**
   * Evaluates a student answer against the task's reference answer.
   *
   * When `correctAnswer` is present, comparison is normalized (case, whitespace,
   * optional `x =` prefix). Multiple accepted forms can be provided separated by `|`.
   * When absent, falls back to the demo keywords (mock mode).
   */
  evaluate(answer: string, correctAnswer?: string | null): AnswerCheck {
    if (correctAnswer && correctAnswer.trim()) {
      const accepted = correctAnswer
        .split(ANSWER_SEPARATOR)
        .map((form) => this.normalize(form))
        .filter((form) => form.length > 0);

      if (accepted.length) {
        const normalizedAnswer = this.normalize(answer);
        const correct = accepted.some((form) => this.matches(normalizedAnswer, form));
        return {
          correct,
          feedback: correct
            ? 'Верно! Ответ совпадает с эталонным.'
            : 'Неверно. Сравни с эталонным ответом и разбери шаги решения.',
          mistakeType: correct ? null : this.classifyMistake(answer),
        };
      }
    }

    // Fallback (mock): accept demo keywords for tasks without a configured answer.
    const correct = /^(correct|правильно)$/i.test(answer.trim());
    return {
      correct,
      feedback: correct
        ? 'Верно! Ответ принят в demo-режиме.'
        : 'Ответ отмечен как ошибка. Попробуй разобрать шаги решения.',
      mistakeType: correct ? null : this.classifyMistake(answer),
    };
  }

  private normalize(value: string): string {
    return value
      .toLowerCase()
      .replace(/[;,]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /** Compares two normalized strings, ignoring an optional leading `variable =` prefix. */
  private matches(normalizedAnswer: string, form: string): boolean {
    if (normalizedAnswer === form) {
      return true;
    }
    const answerValue = normalizedAnswer.replace(/^[a-zа-я]+\s*=\s*/, '');
    const formValue = form.replace(/^[a-zа-я]+\s*=\s*/, '');
    return answerValue.length > 0 && answerValue === formValue;
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
