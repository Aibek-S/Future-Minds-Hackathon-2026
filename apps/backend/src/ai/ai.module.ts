import { Global, Module } from '@nestjs/common';
import { AiContextService } from './ai.context';
import { AiMockProvider } from './ai.mock';
import { AiRetryService } from './ai.retry';
import { AiRouterService } from './ai.router';
import { AiService } from './ai.service';
import { AiTiktokenService } from './ai.tiktoken';

@Global()
@Module({
  providers: [
    AiService,
    AiRouterService,
    AiRetryService,
    AiContextService,
    AiTiktokenService,
    AiMockProvider,
  ],
  exports: [AiService],
})
export class AiModule {}
