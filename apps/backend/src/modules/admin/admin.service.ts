import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async metrics() {
    const [users, students, teachers, classes, attempts, pendingVoiceFeedback] = await Promise.all([
      this.prisma.user.count(), this.prisma.student.count(), this.prisma.teacher.count(), this.prisma.class.count(),
      this.prisma.attempt.count(), this.prisma.voiceFeedback.count({ where: { status: { in: ['PENDING', 'PROCESSING'] } } }),
    ]);
    return { users, students, teachers, classes, attempts, pendingVoiceFeedback };
  }

  listUsers() { return this.prisma.user.findMany({ select: { id: true, email: true, name: true, phone: true, role: true, createdAt: true }, orderBy: { createdAt: 'desc' } }); }

  async createUser(input: { email: string; password: string; name: string; role: Role; grade?: number; phone?: string }) {
    if (await this.prisma.user.findUnique({ where: { email: input.email }, select: { id: true } })) throw new ConflictException('Email already registered');
    const passwordHash = await bcrypt.hash(input.password, 10);
    return this.prisma.$transaction(async (db) => {
      const user = await db.user.create({ data: { email: input.email, passwordHash, name: input.name, phone: input.phone, role: input.role } });
      if (input.role === Role.STUDENT) await db.student.create({ data: { userId: user.id, grade: input.grade ?? 9 } });
      else await db.teacher.create({ data: { userId: user.id } });
      return { id: user.id, email: user.email, name: user.name, role: user.role };
    });
  }

  async updateUser(id: string, input: { name?: string; phone?: string; role?: Role }) {
    try { return await this.prisma.user.update({ where: { id }, data: input, select: { id: true, email: true, name: true, phone: true, role: true } }); }
    catch { throw new NotFoundException('User not found'); }
  }

  async removeUser(id: string) {
    try { await this.prisma.user.delete({ where: { id } }); return { id, deleted: true }; }
    catch { throw new NotFoundException('User not found'); }
  }
}
