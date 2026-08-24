import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayInit } from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisPubSubService } from './redis-pubsub.service';

@WebSocketGateway({ namespace: '/realtime', cors: { origin: true } })
export class RealtimeGateway implements OnGatewayConnection, OnGatewayInit {
  constructor(private readonly jwt: JwtService, private readonly prisma: PrismaService, private readonly broker: RedisPubSubService) {}
  @WebSocketServer() server: Server;
  afterInit() { this.broker.onMessage(({ event, payload }) => this.emitLocal(event, payload)); }
  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token ?? client.handshake.query?.token;
      if (typeof token !== 'string') throw new Error('Missing token');
      const payload = this.jwt.verify<{ sub: string }>(token);
      client.join(`user:${payload.sub}`);
      const student = await this.prisma.student.findUnique({ where: { userId: payload.sub }, select: { id: true, classId: true } });
      if (student) {
        client.join(`student:${student.id}`);
        if (student.classId) client.join(`class:${student.classId}`);
      } else {
        const teacher = await this.prisma.teacher.findUnique({ where: { userId: payload.sub }, select: { id: true } });
        if (teacher) {
          const classes = await this.prisma.class.findMany({ where: { teacherId: teacher.id }, select: { id: true } });
          classes.forEach((item) => client.join(`class:${item.id}`));
        }
      }
    } catch { client.disconnect(true); }
  }
  async emitKnowledgeStateUpdated(payload: { studentId: string; topicId: string; masteryAfter: number; timestamp: string }) {
    await this.emit('knowledge_state_updated', payload);
  }
  async emitTaskAttemptSubmitted(payload: { studentId: string; topicId: string; correct: boolean; masteryAfter: number }) {
    await this.emit('task_attempt_submitted', payload);
  }
  emitVoiceFeedbackProcessed(payload: { userId: string; feedbackId: string; analysis: unknown }) {
    this.server.to(`user:${payload.userId}`).emit('voice_feedback_processed', payload);
    this.broker.publish('voice_feedback_processed', payload);
  }
  emitNewRecommendation(payload: { classId: string; recommendationId: string; type: string }) {
    this.server.to(`class:${payload.classId}`).emit('new_recommendation', payload);
    this.broker.publish('new_recommendation', payload);
  }
  private async emit(event: string, payload: Record<string, unknown>) {
    const student = await this.prisma.student.findUnique({ where: { id: payload.studentId as string }, select: { classId: true } });
    const enriched = { ...payload, classId: student?.classId ?? null };
    this.emitLocal(event, enriched); this.broker.publish(event, enriched);
  }
  private emitLocal(event: string, payload: Record<string, unknown>) {
    if (event === 'voice_feedback_processed' && payload.userId) { this.server.to(`user:${payload.userId}`).emit(event, payload); return; }
    this.server.to(`student:${payload.studentId}`).emit(event, payload);
    if (payload.classId) this.server.to(`class:${payload.classId}`).emit(event, payload);
  }
}
