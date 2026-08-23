import { Global, Module } from '@nestjs/common';
import { AiContextService } from './ai.context';
import { AiMockProvider } from './ai.mock';
import { AiRetryService } from './ai.retry';
import { AiRouterService } from './ai.router';
import { AiService } from './ai.service';
import { AiTiktokenService } from './ai.tiktoken';
import { AiToolsService } from './tools/ai-tools.service';

@Global()
@Module({
  providers: [
    AiService,
    AiRouterService,
    AiRetryService,
    AiContextService,
    AiTiktokenService,
    AiMockProvider,
    AiToolsService,
  ],
  exports: [AiService, AiToolsService],
})
export class AiModule {}
