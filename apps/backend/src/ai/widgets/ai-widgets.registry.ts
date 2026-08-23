export type AiWidgetType = 'QUIZ' | 'MATH_EXPRESSION' | 'FORMULA_CARD' | 'STEP_BY_STEP' | 'CONFIRM';

export interface AiWidget {
  type: AiWidgetType;
  payload: Record<string, unknown>;
}

export const MAX_WIDGETS_PER_MESSAGE = 3;

export const WIDGET_NAMES: AiWidgetType[] = [
  'QUIZ',
  'MATH_EXPRESSION',
  'FORMULA_CARD',
  'STEP_BY_STEP',
  'CONFIRM',
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function validateQuiz(payload: unknown): boolean {
  if (!isRecord(payload)) {
    return false;
  }
  return (
    typeof payload.question === 'string' &&
    isStringArray(payload.options) &&
    payload.options.length >= 2 &&
    typeof payload.correctIndex === 'number' &&
    Number.isInteger(payload.correctIndex) &&
    payload.correctIndex >= 0 &&
    payload.correctIndex < payload.options.length
  );
}

function validateMathExpression(payload: unknown): boolean {
  if (!isRecord(payload)) {
    return false;
  }
  return typeof payload.prompt === 'string' && typeof payload.expected === 'string';
}

function validateFormulaCard(payload: unknown): boolean {
  if (!isRecord(payload)) {
    return false;
  }
  return typeof payload.title === 'string' && typeof payload.formula === 'string';
}

function validateStepByStep(payload: unknown): boolean {
  if (!isRecord(payload)) {
    return false;
  }
  return (
    typeof payload.problem === 'string' &&
    Array.isArray(payload.steps) &&
    payload.steps.length >= 1 &&
    payload.steps.every(
      (step) => isRecord(step) && typeof step.title === 'string' && typeof step.content === 'string',
    )
  );
}

function validateConfirm(payload: unknown): boolean {
  if (!isRecord(payload)) {
    return false;
  }
  return typeof payload.title === 'string' && typeof payload.text === 'string';
}

export function isValidWidget(widget: unknown): widget is AiWidget {
  if (!isRecord(widget) || !WIDGET_NAMES.includes(widget.type as AiWidgetType)) {
    return false;
  }
  switch (widget.type) {
    case 'QUIZ':
      return validateQuiz(widget.payload);
    case 'MATH_EXPRESSION':
      return validateMathExpression(widget.payload);
    case 'FORMULA_CARD':
      return validateFormulaCard(widget.payload);
    case 'STEP_BY_STEP':
      return validateStepByStep(widget.payload);
    case 'CONFIRM':
      return validateConfirm(widget.payload);
    default:
      return false;
  }
}
