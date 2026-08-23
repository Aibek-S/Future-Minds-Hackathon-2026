import { validate } from 'class-validator';
import { CreateLessonDto } from './lesson.dto';

const validPlan = {
  objectives: ['Solve linear equations'],
  warmup: 'Review prior knowledge',
  explanation: 'Explain the balance method',
  practice: ['2x + 3 = 7'],
  differentiatedTasks: { weak: ['Worked example'], strong: ['Word problem'] },
  assessment: 'Exit ticket',
  homework: 'Exercises 1-5',
};

describe('LessonPlanValidator', () => {
  it('accepts the agreed lesson plan schema', async () => {
    const dto = Object.assign(new CreateLessonDto(), {
      date: '2026-09-01T09:00:00.000Z', topicId: 'topic-1', planJson: validPlan,
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejects a plan without differentiated tasks', async () => {
    const dto = Object.assign(new CreateLessonDto(), {
      date: '2026-09-01T09:00:00.000Z', topicId: 'topic-1',
      planJson: { ...validPlan, differentiatedTasks: { weak: ['Worked example'] } },
    });

    const errors = await validate(dto);
    expect(errors.some((error) => error.constraints?.lessonPlan)).toBe(true);
  });

  it('rejects empty practice and objectives', async () => {
    const dto = Object.assign(new CreateLessonDto(), {
      date: '2026-09-01T09:00:00.000Z', topicId: 'topic-1',
      planJson: { ...validPlan, objectives: [], practice: [] },
    });

    const errors = await validate(dto);
    expect(errors.some((error) => error.constraints?.lessonPlan)).toBe(true);
  });
});
