export interface AiToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export const TOOL_GET_KNOWLEDGE_STATE = 'get_knowledge_state';
export const TOOL_GET_SUBJECT_SUMMARY = 'get_subject_summary';
export const TOOL_GET_ROADMAP = 'get_roadmap';
export const TOOL_UPDATE_STUDENT_PROFILE = 'update_student_profile';
export const TOOL_GET_CLASS_OVERVIEW = 'get_class_overview';

/**
 * Function-calling tool schemas exposed to the LLM (OpenAI `tools` format).
 * Only used when the caller enables tools for a given task.
 */
export const AI_TOOL_DEFINITIONS: AiToolDefinition[] = [
  {
    name: TOOL_GET_KNOWLEDGE_STATE,
    description:
      'Возвращает уровень усвоения (mastery 0..1) ученика по каждой теме, количество попыток, тренд и флаг открытия темы (prerequisiteMet). Полезно, когда нужно понять, что ученик уже знает или где отстаёт.',
    parameters: {
      type: 'object',
      properties: {
        subjectId: {
          type: 'string',
          description: 'Опциональный ID предмета, чтобы ограничить ответ одной дисциплиной.',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: TOOL_GET_SUBJECT_SUMMARY,
    description:
      'Возвращает сводку по предметам ученика: средний mastery, количество тем и завершённых тем по каждому предмету. Полезно, чтобы сравнить, какой предмет даётся лучше/хуже.',
    parameters: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: TOOL_GET_ROADMAP,
    description:
      'Возвращает персональный план обучения: завершённые темы, текущую тему с причиной и следующие темы. Полезно, когда ученик спрашивает «что мне учить дальше».',
    parameters: {
      type: 'object',
      properties: {
        subjectId: {
          type: 'string',
          description: 'Опциональный ID предмета, чтобы ограничить план одной дисциплиной.',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: TOOL_UPDATE_STUDENT_PROFILE,
    description:
      'Обновляет цели (goals) и предпочтения (preferences) ученика. Цели — массив объектов { subject, target, deadline?, priority? }. Предпочтения — объект вида { language?, explanationStyle?, weakTopics? }. Возвращает обновлённый профиль.',
    parameters: {
      type: 'object',
      properties: {
        goals: {
          type: 'array',
          description: 'Цели обучения ученика.',
          items: {
            type: 'object',
            properties: {
              subject: { type: 'string' },
              target: { type: 'string' },
              deadline: { type: 'string', description: 'ISO date, опционально' },
              priority: { type: 'number', description: '1..10, опционально' },
            },
            required: ['subject', 'target'],
          },
        },
        preferences: {
          type: 'object',
          description: 'Предпочтения стиля обучения.',
          properties: {
            language: { type: 'string' },
            explanationStyle: { type: 'string' },
            weakTopics: { type: 'array', items: { type: 'string' } },
          },
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: TOOL_GET_CLASS_OVERVIEW,
    description:
      'Возвращает статистику класса учителя: средний mastery класса, сильные и слабые темы, список учеников в зоне риска (mastery < 0.4) с их общим mastery. Используется для планирования урока или рекомендаций по классу.',
    parameters: {
      type: 'object',
      properties: {
        classId: {
          type: 'string',
          description: 'ID класса.',
        },
      },
      required: ['classId'],
      additionalProperties: false,
    },
  },
];

export const AI_TOOLS_BY_TASK: Record<string, string[]> = {
  chat: [TOOL_GET_KNOWLEDGE_STATE, TOOL_GET_SUBJECT_SUMMARY, TOOL_GET_ROADMAP],
  'chat_with_profile': [
    TOOL_GET_KNOWLEDGE_STATE,
    TOOL_GET_SUBJECT_SUMMARY,
    TOOL_GET_ROADMAP,
    TOOL_UPDATE_STUDENT_PROFILE,
  ],
  orchestrator: [TOOL_GET_CLASS_OVERVIEW],
};

/** Wraps our definitions into the OpenAI `tools` wire format. */
export function toOpenAITools(definitions: AiToolDefinition[]): unknown[] {
  return definitions.map((definition) => ({
    type: 'function',
    function: {
      name: definition.name,
      description: definition.description,
      parameters: definition.parameters,
    },
  }));
}
