import { firstValueFrom, take } from 'rxjs';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  it('delivers a revision notification to the student stream', async () => {
    const service = new NotificationsService();
    const event = firstValueFrom(service.streamFor('student-user').pipe(take(1)));

    service.notifyAssignmentRevision('student-user', { studentAssignmentId: 'sa-1', comment: 'Please revise task 2.' });

    await expect(event).resolves.toMatchObject({
      type: 'ASSIGNMENT_REVISION_REQUIRED',
      payload: { studentAssignmentId: 'sa-1', comment: 'Please revise task 2.' },
    });
  });
});
