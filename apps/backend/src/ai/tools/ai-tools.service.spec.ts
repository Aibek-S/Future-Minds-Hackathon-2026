import { AiToolsService } from './ai-tools.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('AiToolsService', () => {
  let prisma: {
    topic: { findMany: jest.Mock };
    subject: { findMany: jest.Mock };
    student: { update: jest.Mock };
  };
  let service: AiToolsService;

  beforeEach(() => {
    prisma = {
      topic: { findMany: jest.fn() },
      subject: { findMany: jest.fn() },
      student: { update: jest.fn() },
    };
    service = new AiToolsService(prisma as unknown as PrismaService);
  });

  it('returns knowledge state with prerequisite flags', async () => {
    prisma.topic.findMany.mockResolvedValue([
      {
        id: 't1', name: 'Линейные', prerequisites: [],
        knowledge: [{ mastery: 0.6, attempts: 4, correctAttempts: 3 }],
      },
      {
        id: 't2', name: 'Квадратные', prerequisites: ['t1'],
        knowledge: [],
      },
    ]);

    const result = JSON.parse(await service.execute('get_knowledge_state', {}, { studentId: 's1' }));

    expect(result.topics[0].mastery).toBe(0.6);
    expect(result.topics[0].prerequisiteMet).toBe(true);
    // t1 mastery 0.6 > 0.4 threshold, so t2 is unlocked
    expect(result.topics[1].prerequisiteMet).toBe(true);
  });

  it('returns subject summary with average mastery', async () => {
    prisma.subject.findMany.mockResolvedValue([
      {
        id: 'sub1', name: 'Алгебра',
        topics: [{ knowledge: [{ mastery: 0.9 }] }, { knowledge: [{ mastery: 0.3 }] }, { knowledge: [] }],
      },
    ]);

    const result = JSON.parse(await service.execute('get_subject_summary', {}, { studentId: 's1' }));

    expect(result.subjects[0].avgMastery).toBe(0.4);
    expect(result.subjects[0].topicsCompleted).toBe(1);
    expect(result.subjects[0].topicCount).toBe(3);
  });

  it('returns roadmap with current and next topics', async () => {
    prisma.topic.findMany.mockResolvedValue([
      {
        id: 't1', name: 'Линейные', prerequisites: [],
        knowledge: [{ mastery: 0.9 }],
      },
      {
        id: 't2', name: 'Квадратные', prerequisites: ['t1'],
        knowledge: [{ mastery: 0.3 }],
      },
    ]);

    const result = JSON.parse(await service.execute('get_roadmap', {}, { studentId: 's1' }));

    expect(result.completed).toEqual(['Линейные']);
    expect(result.current.topicName).toBe('Квадратные');
  });

  it('updates student profile with goals and preferences', async () => {
    prisma.student.update.mockResolvedValue({
      id: 's1', grade: 9,
      goals: [{ target: 'Олимпиада' }],
      preferences: { language: 'ru' },
    });

    const args = {
      goals: [{ subject: 'math', target: 'Олимпиада' }],
      preferences: { language: 'ru' },
    };
    const result = JSON.parse(await service.execute('update_student_profile', args, { studentId: 's1' }));

    expect(prisma.student.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 's1' }, data: expect.objectContaining({ goals: args.goals, preferences: args.preferences }) }),
    );
    expect(result.goals[0].target).toBe('Олимпиада');
  });

  it('returns error for unknown tool', async () => {
    const result = JSON.parse(await service.execute('unknown_tool', {}, { studentId: 's1' }));
    expect(result.error).toContain('Unknown tool');
  });
});
