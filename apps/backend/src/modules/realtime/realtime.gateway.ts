import { WebSocketGateway, WebSocketServer, OnGatewayConnection } from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../../prisma/prisma.service';

@WebSocketGateway({ namespace: '/realtime', cors: { origin: true } })
export class RealtimeGateway implements OnGatewayConnection {
  constructor(private readonly jwt: JwtService, private readonly prisma: PrismaService) {}
  @WebSocketServer() server: Server;
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
      }
    } catch { client.disconnect(true); }
  }
  emitKnowledgeStateUpdated(payload: { studentId: string; topicId: string; masteryAfter: number; timestamp: string }) {
    this.server.to(`student:${payload.studentId}`).emit('knowledge_state_updated', payload);
  }
  emitTaskAttemptSubmitted(payload: { studentId: string; topicId: string; correct: boolean; masteryAfter: number }) {
    this.server.to(`student:${payload.studentId}`).emit('task_attempt_submitted', payload);
  }
}
