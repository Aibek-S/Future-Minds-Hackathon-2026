export interface AiToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export const TOOL_GET_KNOWLEDGE_STATE = 'get_knowledge_state';
export const TOOL_GET_SUBJECT_SUMMARY = 'get_subject_summary';
export const TOOL_GET_ROADMAP = 'get_roadmap';
export const TOOL_UPDATE_STUDENT_PROFILE = 'update_student_profile';
export const TOOL_INITIALIZE_STUDENT_KNOWLEDGE = 'initialize_student_knowledge';
export const TOOL_GET_CLASS_OVERVIEW = 'get_class_overview';
export const TOOL_SEARCH_MATERIALS = 'search_materials';
export const TOOL_CREATE_LESSON_RECOMMENDATION = 'create_lesson_recommendation';

/**
 * Function-calling tool schemas exposed to the LLM (OpenAI `tools` format).
 * Only used when the caller enables tools for a given task.
 */
export const AI_TOOL_DEFINITIONS: AiToolDefinition[] = [
  {
    name: TOOL_SEARCH_MATERIALS,
    description: 'Ищет семантически близкие учебные материалы. topicId необязателен и ограничивает поиск одной темой.',
    parameters: { type: 'object', properties: { query: { type: 'string' }, topicId: { type: 'string' } }, required: ['query'], additionalProperties: false },
  },
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
      'Обновляет цели (goals), предпочтения (preferences) и класс (grade) ученика. Цели — массив объектов { subject, target, deadline?, priority? }. Предпочтения — объект вида { language?, explanationStyle?, weakTopics? }. grade — число 7..12. Возвращает обновлённый профиль.',
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
        grade: {
          type: 'number',
          description: 'Класс ученика, 7..12, опционально.',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: TOOL_INITIALIZE_STUDENT_KNOWLEDGE,
    description:
      'Сохраняет стартовый уровень mastery по темам после диагностики. Принимает только topicId существующих тем и mastery от 0 до 1. Не перезаписывает уже существующие учебные результаты.',
    parameters: {
      type: 'object',
      properties: {
        knowledge: {
          type: 'array',
          minItems: 1,
          description: 'Начальная оценка знаний по диагностированным темам.',
          items: {
            type: 'object',
            properties: {
              topicId: { type: 'string' },
              mastery: { type: 'number', minimum: 0, maximum: 1 },
            },
            required: ['topicId', 'mastery'],
            additionalProperties: false,
          },
        },
      },
      required: ['knowledge'],
      additionalProperties: false,
    },
  },
  {
    name: TOOL_GET_CLASS_OVERVIEW,
    description:
      'Возвращает статистику текущего класса учителя: средний mastery класса, сильные и слабые темы, список учеников в зоне риска (mastery < 0.4) с их общим mastery. Класс уже определён контекстом сессии — вызывай без аргументов. Используется для планирования урока или рекомендаций по классу.',
    parameters: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: TOOL_CREATE_LESSON_RECOMMENDATION,
    description:
      'Создаёт реальную запись рекомендации плана урока в базе данных для текущего класса (по теме с наименьшим mastery) и возвращает её recommendationId, topicName, masteryPercent. Класс уже определён контекстом сессии — вызывай без аргументов. ОБЯЗАТЕЛЬНО вызывай этот инструмент перед тем, как показать учителю виджет CONFIRM с планом урока — recommendationId из результата нужно положить в payload.resource.recommendationId виджета, иначе кнопки Принять/Отклонить в виджете не будут работать.',
    parameters: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
];

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
