import { Controller, Req, Sse, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Observable, map } from 'rxjs';
import { NotificationsService } from './notifications.service';

type RequestWithUser = { user: { id: string } };

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Sse('notifications/stream')
  stream(@Req() request: RequestWithUser): Observable<MessageEvent> {
    return this.notificationsService.streamFor(request.user.id).pipe(
      map((event) => ({ data: event } as MessageEvent)),
    );
  }
}
