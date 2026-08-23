import { Injectable } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';

export type NotificationEvent = {
  id: string;
  type: 'ASSIGNMENT_REVISION_REQUIRED';
  createdAt: string;
  payload: Record<string, unknown>;
};

@Injectable()
export class NotificationsService {
  private readonly streams = new Map<string, Subject<NotificationEvent>>();

  streamFor(userId: string): Observable<NotificationEvent> {
    return this.getStream(userId).asObservable();
  }

  notifyAssignmentRevision(userId: string, payload: { studentAssignmentId: string; comment: string }) {
    this.getStream(userId).next({
      id: `assignment-revision:${payload.studentAssignmentId}:${Date.now()}`,
      type: 'ASSIGNMENT_REVISION_REQUIRED',
      createdAt: new Date().toISOString(),
      payload,
    });
  }

  private getStream(userId: string) {
    let stream = this.streams.get(userId);
    if (!stream) {
      stream = new Subject<NotificationEvent>();
      this.streams.set(userId, stream);
    }
    return stream;
  }
}
