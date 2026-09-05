# 🔌 API-контракт: AI-платформа персонализированного обучения (v2)

> Официальный контракт для бэкенда (NestJS) и фронтенда (Next.js). Основан на ТЗ v2.
> Base URL: `/v1` (префикс в `main.ts`)
> Auth: JWT в заголовке `Authorization: Bearer <accessToken>`
> Refresh token: в теле запроса или httpOnly cookie

---

## 0. Базовые правила

```
Content-Type: application/json (кроме multipart для voice)

Коды ошибок:
  400 — VALIDATION_ERROR (DTO validation failed)
  401 — UNAUTHORIZED (токен невалиден/просрочен)
  403 — FORBIDDEN (нет прав доступа: роль/владение ресурсом)
  404 — NOT_FOUND
  409 — CONFLICT (дубликат: email, class code)
  429 — TOO_MANY_REQUESTS (rate limit)
  500 — INTERNAL_SERVER_ERROR
  503 — SERVICE_UNAVAILABLE (LLM provider down)

Формат ошибки (всегда):
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "grade must be between 7 and 12",
    "details?: any"
  }
}

Пагинация (где применимо):
  ?page=1&limit=20
  Response: { data: [], meta: { page, limit, total, totalPages } }
```

---

## 1. Auth

### `POST /auth/register`
```json
// Request
{
  "name": "Алтаир",
  "email": "altair@example.com",
  "password": "password123",
  "role": "STUDENT",           // STUDENT | TEACHER
  "grade?: 9,                 // required для STUDENT
  "phone?: "+77001234567"
}

// Response 201
{
  "user": { "id": "u_1", "name": "Алтаир", "role": "STUDENT" },
  "accessToken": "eyJ...",
  "refreshToken": "eyJ..."
}
```

### `POST /auth/login`
```json
// Request
{ "email": "altair@example.com", "password": "password123" }

// Response 200
{ "accessToken": "eyJ...", "refreshToken": "eyJ..." }
```

### `POST /auth/refresh`
```json
// Request
{ "refreshToken": "eyJ..." }

// Response 200
{ "accessToken": "eyJ..." }
```

### `GET /auth/me`
```json
// Headers: Authorization: Bearer <accessToken>
// Response 200
{
  "id": "u_1",
  "email": "altair@example.com",
  "name": "Алтаир",
  "role": "STUDENT",
  "student?: { id: "s_1", grade: 9, classId: "c_1" | null, goals: [], preferences: {} }",
  "teacher?: { id: "t_1" }"
}
```

---

## 2. Students (Ученики)

### `GET /students/:id` — профиль ученика
```json
// Response 200
{
  "id": "s_1",
  "userId": "u_1",
  "grade": 9,
  "classId": "c_1",           // null = автономный режим
  "goals": [                  // Json[]
    { "subject": "math", "target": "ЕНТ", "deadline": "2027-05-15", "priority": 1 }
  ],
  "preferences": {            // Json | null
    "language": "ru",
    "explanationStyle": "socratic",
    "weakTopics": ["derivatives"]
  },
  "createdAt": "2026-08-01T10:00:00Z"
}
```

### `PUT /students/:id` — обновление профиля (goals, preferences, grade)
```json
// Request (partial)
{ "goals": [...], "preferences": { "language": "kz" } }

// Response 200 — обновлённый объект
```

### `POST /students/:id/diagnostic` — Reverse-Asking диагностика (Function Calling entry point)
```json
// Request
{
  "answers": [
    { "topicId": "top_1", "answer": "x=2", "correct": true, "attemptNumber": 1 },
    { "topicId": "top_2", "answer": "x=5", "correct": false, "attemptNumber": 1 }
  ]
}

// Response 200 — стартовый knowledge state
{
  "knowledgeState": [
    { "topicId": "top_1", "topicName": "Functions", "mastery": 0.62, "prerequisiteMet": true },
    { "topicId": "top_2", "topicName": "Derivatives", "mastery": 0.30, "prerequisiteMet": true }
  ],
  "detectedGoals": [{ "subject": "math", "target": "ЕНТ", "deadline": "2027-05-15" }],
  "recommendedStartTopic": "top_1"
}
```

### `GET /students/:id/knowledge?subjectId=:subjectId` — текущее мастерство по темам
`subjectId` — необязательный параметр. При передаче ответ содержит темы только указанного предмета; без него возвращаются темы всех предметов.
```json
// Response 200
{
  "topics": [
    {
      "topicId": "top_2",
      "topicName": "Chain Rule",
      "mastery": 0.31,
      "attempts": 14,
      "correctAttempts": 7,
      "trend": "improving",        // improving | stable | declining
      "prerequisiteMet": true,
      "lastActivity": "2026-08-20T15:30:00Z"
    }
  ]
}
```

### `GET /students/:id/subjects` — сводка по предметам (в каком предмете сильнее)
```json
// Response 200
{
  "subjects": [
    { "id": "sub_1", "name": "Алгебра, 9 класс", "avgMastery": 0.63, "topicCount": 8, "topicsCompleted": 3 },
    { "id": "sub_2", "name": "Геометрия, 9 класс", "avgMastery": 0.18, "topicCount": 8, "topicsCompleted": 0 }
  ]
}
```

### `GET /students/:id/roadmap?subjectId=:subjectId` — адаптивный роадмап
`subjectId` — необязательный параметр. При передаче roadmap и progress целей рассчитываются только по темам указанного предмета.
```json
// Response 200
{
  "completed": ["Functions", "Basic derivatives"],
  "current": { "topicId": "top_2", "topicName": "Chain Rule", "reason": "mastery 31%, 3 recent mistakes" },
  "next": [
    { "topicId": "top_3", "topicName": "Product Rule", "prerequisiteMet": true },
    { "topicId": "top_4", "topicName": "Advanced derivatives", "prerequisiteMet": false, "blockedBy": ["top_3"] }
  ],
  "goals": [
    { "target": "ЕНТ", "deadline": "2027-05-15", "progress": 0.34 }
  ]
}
```

---

## 3. Topics & Tasks (Темы и задания) — CRUD для учителя/админа

### `GET /topics?subjectId=:subjectId` — список тем (дерево)
```json
// Response 200
{
  "topics": [
    { "id": "top_1", "name": "Functions", "subjectId": "sub_1", "parentTopicId": null, "prerequisites": [] },
    { "id": "top_2", "name": "Chain Rule", "subjectId": "sub_1", "parentTopicId": "top_1", "prerequisites": ["top_1"] }
  ]
}
```

### `POST /topics` — создать тему (Teacher/Admin)
```json
// Request
{ "name": "Trigonometry", "subjectId": "sub_1", "parentTopicId": null, "prerequisites": ["top_1"] }
// Response 201 — созданная тема
```

### `PUT /topics/:id` / `DELETE /topics/:id` — стандартный CRUD

### `GET /topics/:id/tasks?difficulty=easy|medium|hard` — задания по теме
```json
// Response 200
{
  "tasks": [
    { "id": "t_5", "topicId": "top_2", "difficulty": "medium", "content": "Найдите производную f(x) = sin(3x+1)", "source": "manual" }
  ]
}
```

### `POST /topics/:id/tasks` — создать задание (Teacher/Admin)
```json
// Request
{ "difficulty": "easy", "content": "Решите: sin(x) = 0.5", "source": "manual" }
// Response 201
```

### `PUT /tasks/:id` / `DELETE /tasks/:id` — CRUD задания

---

## 4. Attempts & Mastery (Ключевой эндпоинт — mastery формула)

### `POST /tasks/:id/attempts` — попытка решения
```json
// Request
{ "studentId": "s_1", "answer": "3cos(3x+1)" }

// Response 200
{
  "correct": true,
  "feedback": "Верно! Ты правильно применил цепное правило.",
  "mistakeType": null,                     // CALCULATION_ERROR | CONCEPTUAL_ERROR | READING_ERROR
  "updatedMastery": {
    "topicId": "top_2",
    "masteryBefore": 0.31,
    "masteryAfter": 0.517,
    "attempts": 5,
    "correctAttempts": 3
  },
  "nextTaskDifficulty": "medium",          // easy | medium | hard (адаптивная сложность)
  "prerequisiteUnlocked": []               // разблокированные темы
}
```

> **Формула mastery (EMA) на бэкенде:**
> ```
> current_result = 1.0 (1-я попытка) | 0.5 (2-я) | 0.1 (3-я+) | 0.0 (неверно)
> new_mastery = 0.7 * previous_mastery + 0.3 * current_result
> ```

---

## 5. AI-чаты по сценариям (SessionKind + SSE)

> Единая модель `TutorSession` с полем `kind`. Каждый сценарий — отдельный URL,
> свой системный промпт, свои tools и виджеты, доступ только своей роли.

**SessionKind:** `STUDENT_CHAT | DIAGNOSTIC | FEEDBACK | ORCHESTRATOR`

| Сценарий | URL | Роль | Что делает |
|---|---|---|---|
| Обычный чат ученика | `/chat/sessions` | STUDENT | репетитор, знает прогресс |
| Диагностика | `/diagnostic/sessions` | STUDENT | reverse-asking, 1 вопрос за раз |
| Фидбэк | `/feedback/sessions` | STUDENT | анализ «что понял/повторить» |
| Оркестратор | `/orchestrator/chat/sessions` | TEACHER | план урока по статистике класса |

> Роль проверяется на бэкенде: STUDENT-чаты недоступны учителю (403) и наоборот.

### `POST /{scenario}/sessions` — создать сессию сценария
```json
// Response 201
{ "sessionId": "sess_1", "kind": "DIAGNOSTIC", "createdAt": "2026-08-21T10:00:00Z" }
```

### `GET /{scenario}/sessions` — список своих сессий
```json
// Response 200
{ "sessions": [ { "id": "sess_1", "createdAt": "...", "messageCount": 4 } ] }
```

### `POST /{scenario}/sessions/:id/messages` — отправить сообщение (SSE streaming)
```json
// Request (для ORCHESTRATOR дополнительно передаётся classId)
{ "content": "Что делать на следующем уроке?", "classId": "c_1" }

// Response: SSE stream
// Event: message
data: { "text": "Рекомендую повторить теорему Виета…" }

// Event: tool (в момент запуска function-calling инструмента на бэкенде;
// используется фронтом для live-индикатора «ИИ ищет материалы…» и т.п.)
data: { "tool": "search_materials" }

// Event: widget (в строгом порядке сегментов)
data: { "widget": { "type": "QUIZ", "payload": { ... } } }

// Event: done
data: { "usage": { "inputTokens": 123, "outputTokens": 45, "model": "deepseek-chat", "provider": "deepseek" } }
```

### `GET /{scenario}/sessions/:id` — история сообщений
```json
// Response 200
{
  "sessionId": "sess_1",
  "kind": "DIAGNOSTIC",
  "messages": [
    { "role": "user", "content": "Привет", "widget": null },
    { "role": "assistant", "content": "К чему готовишься?", "widget": { "type": "QUIZ", "payload": { ... } } }
  ]
}
```

### Виджеты (строгий JSON-контракт, без HTML; максимум `AI_MAX_WIDGETS`, дефолт 3)
> Ответ с виджетами — JSON `{"segments":[...]}`, где каждый элемент
> `{ "kind": "text", "text": "..." }` или `{ "kind": "widget", "widget": {...} }`.
> Виджеты появляются ровно в порядке сегментов. Битый виджет дропается, текст сохраняется.

- `QUIZ` — `{ question, options[], correctIndex, explanation? }`
- `MATH_EXPRESSION` — `{ prompt, expected, explanation? }`
- `FORMULA_CARD` — `{ title, formula, note? }`
- `STEP_BY_STEP` — `{ problem, steps: [{ title, content }] }`
- `CONFIRM` — `{ title, text, resourceType? }` (учитель: «Принять / Отклонить»)

### Tools (Function Calling, выполняется на бэкенде, ИИ в БД не пишет)
- `get_knowledge_state(studentId, subjectId?)` — mastery по темам
- `get_subject_summary(studentId)` — сравнение предметов
- `get_roadmap(studentId, subjectId?)` — план обучения
- `update_student_profile(goals, preferences)` — применяется через валидированный сервис
- `get_class_overview(classId)` — статистика класса (учитель)

### Лимиты
- `AI_MAX_WIDGETS` — макс. виджетов на сообщение (env, дефолт 3)
- `AI_MAX_RETRIES_PRIMARY` / `AI_MAX_RETRIES_FALLBACK` — ретраи LLM
- `AI_TIMEOUT_MS` — таймаут запроса LLM

---

## 6. RAG / Vector Search (внутренний сервис)

> Не публичный API. Используется AI Tutor и Orchestrator.
> `similarity_threshold = 0.65` (cosine). При `< 0.65` → fallback на общие знания LLM с пометкой.

---

## 7. Voice Feedback (Голос)

### `POST /voice-feedback` — загрузить аудио (multipart/form-data)
```bash
curl -X POST /v1/voice-feedback \
  -H "Authorization: Bearer <token>" \
  -F "studentId=s_1" \
  -F "targetType=LESSON" \          # LESSON | TUTOR_SESSION
  -F "targetId=lesson_1" \
  -F "audio=@recording.webm"
```

```json
// Response 202
{ "feedbackId": "vf_1", "status": "processing" }
```

### `GET /voice-feedback/:id` — статус обработки
```json
// Response 200
{
  "feedbackId": "vf_1",
  "status": "done",                 # processing | done | failed
  "transcript": "Сегодня я понял как находить производную...",
  "analysis": {
    "understood": ["basic derivative"],
    "confused": ["chain rule"],
    "confidence": 0.82,
    "recommendedAction": { "type": "practice", "topicId": "top_2" }
  }
}
```

> **VOICE_MODE=mock** в `.env` — мгновенный возврат заготовленного ответа для демо.

---

## 8. Teacher Dashboard (Учитель)

### `GET /teachers/:id/classes` — классы учителя
```json
// Response 200
{ "classes": [{ "id": "c_1", "name": "10А", "grade": 10, "studentCount": 24, "code": "ALG-9B" }] }
```

### `POST /teachers/:id/classes` — создать класс
```json
// Request
{ "name": "10А", "grade": 10 }
// Response 201 — класс с сгенерированным code (nanoid, без похожих символов)
```

### `POST /classes/:id/join` — ученик входит по Class Code
```json
// Request
{ "code": "ALG-9B" }
// Response 200 — { "classId": "c_1", "message": "Joined successfully" }
```

`id` и `code` должны относиться к одному классу. Ученик определяется по JWT; при успешном входе
его `student.classId` заменяется на идентификатор класса.

### `DELETE /classes/:id/students/:sid` — исключить ученика
```json
// Response 200
{ "studentId": "s_1", "classId": null, "message": "Student removed from class" }
```

Доступен только владельцу класса (или ADMIN). Прогресс и история попыток ученика сохраняются.

### `DELETE /classes/:id` — удалить класс
```json
// Response 200
{ "id": "c_1", "message": "Class deleted; students switched to autonomous mode" }
```

Перед удалением всем ученикам класса устанавливается `classId: null`.

### `POST /classes/:id/lessons` — создать урок
```json
// Request
{
  "date": "2026-09-01T09:00:00.000Z",
  "topicId": "top_1",
  "planJson": {
    "objectives": ["Решать линейные уравнения"],
    "warmup": "Повторение",
    "explanation": "Метод баланса",
    "practice": ["2x + 3 = 7"],
    "differentiatedTasks": { "weak": ["Пример с подсказкой"], "strong": ["Текстовая задача"] },
    "assessment": "Exit ticket",
    "homework": "Упражнения 1–5"
  }
}
```

`planJson` обязателен и валидируется по этой структуре: непустые массивы `objectives` и
`practice`; непустые строки `warmup`, `explanation`, `assessment`, `homework`; объект
`differentiatedTasks` с непустыми массивами `weak` и `strong`.

### `GET /classes/:id/lessons?from=&to=` — календарь уроков

Возвращает уроки класса в указанном диапазоне дат, тему и количество связанных заданий/отзывов.

### `GET /lessons/:id` / `PUT /lessons/:id` / `DELETE /lessons/:id`

Детали содержат связанные assignments и статусы учеников. Редактирование и удаление доступны
только учителю-владельцу класса.

### `POST /lessons/:id/feedback` — отзыв ученика
```json
// Request
{ "rating": 5, "commentOrAudioUrl": "Упражнения помогли понять тему" }
```

Отзыв можно оставить только после `lesson.date` и только ученику этого класса.

### `GET /lessons/:id/feedback` — отзывы по уроку

Доступно учителю-владельцу класса; ответ содержит автора, рейтинг, текст или URL голосового отзыва.

### `GET /classes/:id/overview` — дашборд класса
```json
// Response 200
{
  "classMastery": 0.64,
  "strongTopics": [{ "topicId": "top_1", "topicName": "Functions", "mastery": 0.81 }],
  "weakTopics": [{ "topicId": "top_2", "topicName": "Chain Rule", "mastery": 0.43 }],
  "studentsNeedingRemediation": 12
}
```

### `GET /classes/:id/heatmap` — матрица «Ученики × Темы»
```json
// Response 200
{
  "topics": [{ "id": "top_1", "name": "Functions" }],
  "students": [{
    "studentId": "s_1",
    "studentName": "Алтаир",
    "topics": [{ "topicId": "top_1", "mastery": 0.81, "status": "GREEN" }]
  }]
}
```

`GREEN` — mastery ≥ 0.7, `YELLOW` — 0.4–0.699, `RED` — < 0.4.

### `GET /classes/:id/students` — список учеников
```json
// Response 200
{
  "students": [
    { "id": "s_1", "name": "Алтаир", "mastery": 0.41, "trend": "stable", "lastActive": "2026-08-20" }
  ]
}
```

### `GET /students/:id/profile` — профиль ученика (вид учителя)
```json
// Response 200
{
  "id": "s_1",
  "name": "Алтаир",
  "overallMastery": 0.58,
  "strongTopics": ["Functions"],
  "weakTopics": ["Chain Rule", "Word Problems"],
  "recentMistakes": [
    { "topicId": "top_2", "type": "CALCULATION_ERROR", "count": 3 }
  ]
}
```

### `GET /classes/:id/students/:sid/attempts` — история попыток ученика
```json
// Response 200
{
  "attempts": [{
    "id": "att_1", "taskId": "t_1", "topicId": "top_2", "topicName": "Chain Rule",
    "answer": "...", "correct": false, "attemptNumber": 2, "createdAt": "2026-08-20T10:00:00Z"
  }]
}
```

---

## 9. AI Teacher Orchestrator

> Два режима: **чат** (`/orchestrator/chat/sessions`, только TEACHER, LLM + статистика класса + CONFIRM-виджет)
> и классический `query`/`recommendations`. Единое правило: **AI никогда не пишет в БД напрямую** —
> только через approve учителя.

### `POST /orchestrator/chat/sessions` — чат-сессия учителя (только TEACHER)
```json
// Response 201
{ "sessionId": "sess_1", "kind": "ORCHESTRATOR", "createdAt": "..." }
```

### `POST /orchestrator/chat/sessions/:id/messages` — вопрос по классу (SSE)
```json
// Request
{ "content": "Предложи план урока", "classId": "c_1" }

// Response: SSE
// Event: message  -> текст с обоснованием (цифры из get_class_overview)
// Event: widget   -> { "type": "CONFIRM", "payload": { "title": "План урока", "text": "...", "resourceType": "LESSON_PLAN" } }
// Event: done     -> usage
```
> Учитель подтверждает предложение кнопкой в CONFIRM-виджете, далее фронт вызывает
> `POST /recommendations/:id/approve` (или `/reject`).

### `POST /orchestrator/query` — вопрос учителю от ИИ (одноразовый)
```json
// Request
{ "teacherId": "t_1", "classId": "c_1", "question": "Что делать на следующем уроке?" }

// Response 200
{
  "answer": "Рекомендую 15 минут повторения теоремы Виета.",
  "reasoning": [
    "43% class mastery по теме",
    "61% ошибок — CALCULATION_ERROR",
    "8 учеников имеют mastery < 40%"
  ],
  "suggestedRecommendationId": "rec_1"
}
```

### `GET /recommendations?classId=c_1&status=pending` — список рекомендаций
```json
// Response 200
{
  "recommendations": [
    {
      "id": "rec_1",
      "type": "LESSON_PLAN",              // LESSON_PLAN | REMEDIAL_TASK | STUDENT_ALERT
      "recommendation": { "revisionMinutes": 15, "practiceTasks": 8, "individualTaskFor": ["s_1"] },
      "reasoning": "11 students struggling with Chain Rule",
      "status": "pending",
      "createdAt": "2026-08-21T10:00:00Z"
    }
  ]
}
```

### `POST /recommendations/:id/approve` — учитель одобряет (ТОЛЬКО ТУТ пишется в БД)
```json
// Request (опционально — правки)
{ "edits": { "revisionMinutes": 10 } }

// Response 200
{ "id": "rec_1", "status": "approved", "lessonId": "lesson_1" }
```
> Для рекомендации `LESSON_PLAN` создаёт Lesson на основе `payload`; `edits` может изменить
> `topicId`, `date` или полный `planJson`, который повторно валидируется по схеме урока.

### `POST /recommendations/:id/reject`
```json
// Response 200
{ "id": "rec_1", "status": "rejected" }
```

---

## 10. Content Management (Обязательный пункт F трека)

### `POST /classes/:id/topics` — добавить тему в класс
```json
// Request
{ "name": "Trigonometry", "subjectId": "sub_1", "parentTopicId": null }
// Response 201 — автовекторизация в фоне
```

### `POST /topics/:id/materials` — загрузить материал (текст/файл)
```json
// Request (multipart или JSON)
{ "content": "Текст конспекта...", "sourceUrl?: "https://..." }
// Response 202 — { "materialId": "mv_1", "status": "vectorizing" }
```

### `GET /materials/search` — семантический поиск по материалам

```http
GET /v1/materials/search?query=теорема%20Пифагора&topicId=topic_1
Authorization: Bearer <jwt>

// Response 200
{
  "materials": [{ "id": "mv_1", "topicId": "topic_1", "content": "...", "similarity": 0.87 }],
  "fallbackToGeneralKnowledge": false,
  "similarityThreshold": 0.65
}
```

### `POST /topics/:id/tasks` — добавить задание (см. раздел 3)

---

## 11. Assignments (Домашние задания: Online / Offline)

### `POST /classes/:id/assignments` — выдать задание
```json
// Request
{
  "topicId": "top_2",
  "mode": "ONLINE",                    // ONLINE | OFFLINE
  "isUnique": false,                   // true = индивидуально для targetIds
  "targetIds": ["s_1", "s_2"],         // если isUnique=true
  "taskIds": ["t_5", "t_6"],           // для ONLINE
  "dueDate": "2026-08-25T23:59:00Z"
}

// Response 201
{ "id": "asg_1", "studentAssignments": [...] }
```

Для ONLINE `taskIds` обязательны и каждая задача должна принадлежать указанной теме. При
`isUnique: true` все `targetIds` обязательны и должны быть учениками этого класса; иначе ДЗ
создаётся для всех учеников класса.

### `GET /assignments/:id` — детали задания

Доступно учителю-владельцу класса; ответ содержит тему, урок при наличии, задачи и статусы
`studentAssignments` с именами учеников.

### `POST /student-assignments/:id/submit` — ученик сдаёт (ONLINE: ответ, OFFLINE: "Сдал в классе")
```json
// Request (ONLINE)
{ "answers": [{ "taskId": "t_5", "answer": "..." }] }
// Request (OFFLINE)
{ "submittedInClass": true }

// Response 200
{ "status": "AI_GRADED" | "PENDING_VERIFICATION" }
```

ONLINE принимает ровно один ответ на каждую задачу и сохраняет результат `AnswerChecker`.
OFFLINE переводится в `PENDING_VERIFICATION` только после `{ "submittedInClass": true }`.

### `POST /student-assignments/:id/verify` — учитель проверяет OFFLINE
```json
// Request
{ "action": "APPROVE" | "REJECT", "comment?: "Нужно перерешать" }
// Response 200 — { "status": "TEACHER_VERIFIED" | "REVISION_REQUIRED" }
```

Проверять можно только submitted OFFLINE-работу. Для `REJECT` обязателен `comment`, который
сохраняется вместе с отправленной работой.

---

### `GET /notifications/stream` — realtime уведомления ученика

SSE-поток с Bearer JWT. При `REJECT` offline-ДЗ ученик получает событие:
```json
{
  "type": "ASSIGNMENT_REVISION_REQUIRED",
  "payload": { "studentAssignmentId": "sa_1", "comment": "Нужно перерешать" }
}
```

## 12. WebSocket Events (Real-time)

**Подключение:** `wss://api.domain/v1/realtime?token=<jwt>`

| Событие | Направление | Payload |
|---------|-------------|---------|
| `knowledge_state_updated` | Server → Student + Teacher (class) | `{ studentId, topicId, masteryAfter, timestamp }` |
| `voice_feedback_processed` | Server → Student | `{ feedbackId, analysis }` |
| `new_recommendation` | Server → Teacher | `{ recommendationId, classId, type }` |
| `task_attempt_submitted` | Server → Teacher (heatmap) | `{ studentId, topicId, correct, masteryAfter }` |

```json
// Пример входящего сообщения
{
  "event": "knowledge_state_updated",
  "data": { "studentId": "s_1", "topicId": "top_2", "masteryAfter": 0.517, "timestamp": "2026-08-21T10:05:00Z" }
}
```

---

## 13. Demo Interceptor (для защиты/видео)

**Header:** `X-Demo-User: student | teacher`

> ⚠️ Планируется, не реализовано. Идея: LLM/RAG/Orchestrator ответы для demo-аккаунтов
> берутся из Redis-кэша с имитацией задержки 300–400 мс, чтобы 3-минутное видео не зависало
> на реальных 5–12 секундах ответа LLM.

---

## 14. Rate Limiting & Security

- `@nestjs/throttler` (глобальный лимит; per-endpoint лимиты — в TODO)
- Chat / Diagnostic / Feedback / Orchestrator: 20–50 сообщений/час (автономный / школьный)
- Voice: 5/hr (автономный) / 20/hr (школьный) — TODO
- Prompt Injection Guard: пользовательский ввод в теги `[STUDENT_INPUT_START]...[STUDENT_INPUT_END]`
- Ролевая изоляция чатов: STUDENT-чаты — только STUDENT, Orchestrator — только TEACHER
- Виджеты — строгий JSON-контракт, битые отбрасываются (чат не падает)

---

## 15. Что НЕ в контракте (планируется после хакатона)

- RAG / Vector Search (`search_materials` + реальные embeddings) — отдельный этап
- Voice feedback (STT Whisper + анализ) — отдельный этап
- WebSocket Realtime (heatmap live) — отдельный этап
- Пагинация для всех списков (добавить при росте данных)
- ТТS (голосовые ответы ИИ)
- Мультиязычность (kz/en)
- Геймификация (стрики, достижения)
- BKT/DKT модели поверх EMA
- Рекомендательная система на эмбеддингах

---

*Генерация Prisma Client: `pnpm db:generate`*
*Миграции: `pnpm db:migrate`*
*Сид: `pnpm db:seed` (после реализации)*
