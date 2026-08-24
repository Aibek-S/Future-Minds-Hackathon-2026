import { CHAT_SYSTEM_PROMPT, CHAT_WITH_PROFILE_SYSTEM_PROMPT } from './prompts/chat.prompt';
import { DIAGNOSTIC_SYSTEM_PROMPT } from './prompts/diagnostic.prompt';
import { FEEDBACK_SYSTEM_PROMPT } from './prompts/feedback.prompt';
import { ORCHESTRATOR_SYSTEM_PROMPT } from './prompts/orchestrator.prompt';
import {
  TOOL_GET_KNOWLEDGE_STATE,
  TOOL_GET_ROADMAP,
  TOOL_GET_SUBJECT_SUMMARY,
  TOOL_UPDATE_STUDENT_PROFILE,
  TOOL_INITIALIZE_STUDENT_KNOWLEDGE,
  TOOL_GET_CLASS_OVERVIEW,
  TOOL_SEARCH_MATERIALS,
} from './tools/ai-tools.registry';
import { SessionKind } from '@prisma/client';

export type AiTask = SessionKind;

export interface AiTaskConfig {
  prompt: string;
  tools: string[];
  widgets: boolean;
  /** Default widget cap per message; overridable by AI_MAX_WIDGETS. */
  widgetLimit: number;
}

export const AI_TASKS: Record<AiTask, AiTaskConfig> = {
  [SessionKind.STUDENT_CHAT]: {
    prompt: CHAT_WITH_PROFILE_SYSTEM_PROMPT,
    tools: [
      TOOL_GET_KNOWLEDGE_STATE,
      TOOL_GET_SUBJECT_SUMMARY,
      TOOL_GET_ROADMAP,
      TOOL_UPDATE_STUDENT_PROFILE,
      TOOL_SEARCH_MATERIALS,
    ],
    widgets: true,
    widgetLimit: 3,
  },
  [SessionKind.DIAGNOSTIC]: {
    prompt: DIAGNOSTIC_SYSTEM_PROMPT,
    tools: [TOOL_UPDATE_STUDENT_PROFILE, TOOL_INITIALIZE_STUDENT_KNOWLEDGE, TOOL_GET_KNOWLEDGE_STATE],
    widgets: true,
    widgetLimit: 5,
  },
  [SessionKind.FEEDBACK]: {
    prompt: FEEDBACK_SYSTEM_PROMPT,
    tools: [TOOL_GET_KNOWLEDGE_STATE, TOOL_GET_ROADMAP],
    widgets: true,
    widgetLimit: 3,
  },
  [SessionKind.ORCHESTRATOR]: {
    prompt: ORCHESTRATOR_SYSTEM_PROMPT,
    tools: [TOOL_GET_CLASS_OVERVIEW],
    widgets: true,
    widgetLimit: 2,
  },
};

export function getTaskConfig(task: AiTask): AiTaskConfig {
  return AI_TASKS[task] ?? AI_TASKS[SessionKind.STUDENT_CHAT];
}

/** Which sessions are owned by a student vs a teacher. */
export function isStudentKind(kind: AiTask): boolean {
  return kind === SessionKind.STUDENT_CHAT || kind === SessionKind.DIAGNOSTIC || kind === SessionKind.FEEDBACK;
}
