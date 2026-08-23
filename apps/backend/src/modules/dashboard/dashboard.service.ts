import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

type Requester = { id: string; role: string };
type StudentKnowledgeItem = { mastery: number; lastActivity: Date; topic: { id: string; name: string } };

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(classId: string, requester: Requester) {
    await this.assertClassOwner(classId, requester);
    const students = await this.getClassStudents(classId);
    const topics = this.getTopicMetrics(students.flatMap((student) => student.knowledge));
    const studentMasteries = students.map((student) => this.getAverageMastery(student.knowledge));

    return {
      classMastery: this.round(this.average(studentMasteries)),
      strongTopics: topics.filter((topic) => topic.mastery >= 0.7).sort((a, b) => b.mastery - a.mastery).slice(0, 5),
      weakTopics: topics.filter((topic) => topic.mastery < 0.4).sort((a, b) => a.mastery - b.mastery).slice(0, 5),
      studentsNeedingRemediation: studentMasteries.filter((mastery) => mastery < 0.4).length,
    };
  }

  async getHeatmap(classId: string, requester: Requester) {
    await this.assertClassOwner(classId, requester);
    const students = await this.getClassStudents(classId);
    const topicIds = [...new Set(students.flatMap((student) => student.knowledge.map((item) => item.topic.id)))];
    const topics = [...new Map(
      students.flatMap((student) => student.knowledge.map((item) => [item.topic.id, item.topic])),
    ).values()];

    return {
      topics: topics.filter((topic) => topicIds.includes(topic.id)),
      students: students.map((student) => {
        const masteryByTopic = new Map(student.knowledge.map((item) => [item.topic.id, item.mastery]));
        return {
          studentId: student.id,
          studentName: student.user.name,
          topics: topicIds.map((topicId) => {
            const mastery = masteryByTopic.get(topicId) ?? 0;
            return { topicId, mastery: this.round(mastery), status: this.getHeatmapStatus(mastery) };
          }),
        };
      }),
    };
  }

  async getStudents(classId: string, requester: Requester) {
    await this.assertClassOwner(classId, requester);
    const students = await this.getClassStudents(classId, true);
    return {
      students: students.map((student) => ({
        id: student.id,
        name: student.user.name,
        mastery: this.round(this.getAverageMastery(student.knowledge)),
        trend: this.getTrend(student.attempts),
        lastActive: this.getLastActive(student.knowledge, student.attempts),
      })),
    };
  }

  async getStudentProfile(studentId: string, requester: Requester) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: {
        user: { select: { name: true } },
        class: { select: { teacherId: true } },
        knowledge: { include: { topic: { select: { id: true, name: true } } } },
        mistakes: { orderBy: { createdAt: 'desc' }, take: 50, include: { topic: { select: { id: true, name: true } } } },
      },
    });
    if (!student) {
      throw new NotFoundException('Student not found');
    }
    if (!student.class) {
      throw new ForbiddenException('Student is not currently enrolled in a class');
    }
    await this.assertTeacherIdAccess(student.class.teacherId, requester);

    const recentMistakes = new Map<string, { topicId: string; topicName: string; type: string; count: number }>();
    for (const mistake of student.mistakes) {
      const key = `${mistake.topicId}:${mistake.type}`;
      const current = recentMistakes.get(key);
      recentMistakes.set(key, current
        ? { ...current, count: current.count + 1 }
        : { topicId: mistake.topicId, topicName: mistake.topic.name, type: mistake.type, count: 1 });
    }

    return {
      id: student.id,
      name: student.user.name,
      overallMastery: this.round(this.getAverageMastery(student.knowledge)),
      strongTopics: student.knowledge.filter((item) => item.mastery >= 0.7).map((item) => item.topic.name),
      weakTopics: student.knowledge.filter((item) => item.mastery < 0.4).map((item) => item.topic.name),
      recentMistakes: [...recentMistakes.values()].slice(0, 10),
    };
  }

  async getStudentAttempts(classId: string, studentId: string, requester: Requester) {
    await this.assertClassOwner(classId, requester);
    const student = await this.prisma.student.findFirst({ where: { id: studentId, classId }, select: { id: true } });
    if (!student) {
      throw new NotFoundException('Student is not enrolled in this class');
    }
    const attempts = await this.prisma.attempt.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
      include: { task: { include: { topic: { select: { id: true, name: true } } } } },
    });
    return {
      attempts: attempts.map((attempt) => ({
        id: attempt.id,
        taskId: attempt.taskId,
        taskContent: attempt.task.content,
        topicId: attempt.task.topic.id,
        topicName: attempt.task.topic.name,
        answer: attempt.answer,
        correct: attempt.correct,
        attemptNumber: attempt.attemptNumber,
        createdAt: attempt.createdAt,
      })),
    };
  }

  private async getClassStudents(classId: string, includeAttempts = false) {
    return this.prisma.student.findMany({
      where: { classId },
      orderBy: { createdAt: 'asc' },
      include: {
        user: { select: { name: true } },
        knowledge: { include: { topic: { select: { id: true, name: true } } } },
        attempts: includeAttempts
          ? { orderBy: { createdAt: 'desc' }, take: 6, select: { correct: true, createdAt: true } }
          : false,
      },
    });
  }

  private getTopicMetrics(knowledge: StudentKnowledgeItem[]) {
    const metrics = new Map<string, { topicId: string; topicName: string; values: number[] }>();
    for (const item of knowledge) {
      const current = metrics.get(item.topic.id) ?? { topicId: item.topic.id, topicName: item.topic.name, values: [] };
      current.values.push(item.mastery);
      metrics.set(item.topic.id, current);
    }
    return [...metrics.values()].map(({ topicId, topicName, values }) => ({
      topicId,
      topicName,
      mastery: this.round(this.average(values)),
    }));
  }

  private async assertClassOwner(classId: string, requester: Requester) {
    const classroom = await this.prisma.class.findUnique({ where: { id: classId }, select: { teacherId: true } });
    if (!classroom) {
      throw new NotFoundException('Class not found');
    }
    await this.assertTeacherIdAccess(classroom.teacherId, requester);
  }

  private async assertTeacherIdAccess(teacherId: string, requester: Requester) {
    if (requester.role === 'ADMIN') {
      return;
    }
    const teacher = await this.prisma.teacher.findUnique({ where: { id: teacherId }, select: { userId: true } });
    if (!teacher || requester.role !== 'TEACHER' || teacher.userId !== requester.id) {
      throw new ForbiddenException('You can view analytics only for your own classes');
    }
  }

  private getAverageMastery(knowledge: StudentKnowledgeItem[]) {
    return this.average(knowledge.map((item) => item.mastery));
  }

  private getTrend(attempts: { correct: boolean }[]) {
    if (attempts.length < 2) {
      return 'stable';
    }
    const recent = attempts.slice(0, Math.ceil(attempts.length / 2));
    const earlier = attempts.slice(Math.ceil(attempts.length / 2));
    if (!earlier.length) {
      return 'stable';
    }
    const delta = this.average(recent.map((item) => Number(item.correct))) - this.average(earlier.map((item) => Number(item.correct)));
    return delta > 0.15 ? 'improving' : delta < -0.15 ? 'declining' : 'stable';
  }

  private getLastActive(knowledge: StudentKnowledgeItem[], attempts: { createdAt: Date }[]) {
    const dates = [...knowledge.map((item) => item.lastActivity), ...attempts.map((item) => item.createdAt)];
    return dates.length ? new Date(Math.max(...dates.map((date) => date.getTime()))) : null;
  }

  private getHeatmapStatus(mastery: number) {
    return mastery >= 0.7 ? 'GREEN' : mastery >= 0.4 ? 'YELLOW' : 'RED';
  }

  private average(values: number[]) {
    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  }

  private round(value: number) {
    return Number(value.toFixed(3));
  }
}
