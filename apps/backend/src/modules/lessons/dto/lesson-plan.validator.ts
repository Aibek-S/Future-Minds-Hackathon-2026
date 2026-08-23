import { ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';

const REQUIRED_TEXT_FIELDS = ['warmup', 'explanation', 'assessment', 'homework'] as const;

@ValidatorConstraint({ name: 'lessonPlan', async: false })
export class LessonPlanValidator implements ValidatorConstraintInterface {
  validate(value: unknown) {
    if (!this.isRecord(value) || !this.isTextList(value.objectives) || !this.isTextList(value.practice)) {
      return false;
    }
    if (!REQUIRED_TEXT_FIELDS.every((field) => this.isText(value[field]))) {
      return false;
    }
    return this.isRecord(value.differentiatedTasks)
      && this.isTextList(value.differentiatedTasks.weak)
      && this.isTextList(value.differentiatedTasks.strong);
  }

  defaultMessage(args: ValidationArguments) {
    return `${args.property} must contain objectives, warmup, explanation, practice, differentiatedTasks, assessment and homework`;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private isText(value: unknown) {
    return typeof value === 'string' && value.trim().length > 0;
  }

  private isTextList(value: unknown) {
    return Array.isArray(value) && value.length > 0 && value.every((item) => this.isText(item));
  }
}
