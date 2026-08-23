import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SubjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const subjects = await this.prisma.subject.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { topics: true } } },
    });
    return {
      subjects: subjects.map(({ _count, ...subject }) => ({
        ...subject,
        topicCount: _count.topics,
      })),
    };
  }
}