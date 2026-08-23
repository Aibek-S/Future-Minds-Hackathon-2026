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

## 5. AI Tutor (Чат с виджетами + SSE)

### `POST /tutor/sessions` — создать сессию
```json
// Request
{ "studentId": "s_1", "topicId?: "top_2" }

// Response 201
{ "sessionId": "sess_1", "createdAt": "2026-08-21T10:00:00Z" }
```

### `POST /tutor/sessions/:id/messages` — отправить сообщение (SSE streaming)
```json
// Request
{ "role": "student", "content": "Я не понимаю производную." }

// Response: SSE stream
// Event: message
data: { "role": "assistant", "content": "Смотри, у тебя mastery по функциям 81%...", "socraticMode": true }

// Event: widget (после полного JSON виджета)
data: { "type": "QUIZ", "payload": { "question": "...", "options": ["A","B","C"], "correctIndex": 0 } }

// Event: done
data: { "sessionId": "sess_1", "summary": { "understood": ["basic derivative"], "struggled": ["chain rule"] } }
```

> **Виджеты (строгий JSON контракт, никакого HTML):**
> - `QUIZ` — `{ question, options[], correctIndex, explanation? }`
> - `ROADMAP` — `{ current, next[], goals[] }`
> - `LESSON_PLAN` — `{ objectives[], warmup, explanation, practice[], homework }`
> - `FLASHCARD` — `{ front, back, topicId }`

### `GET /tutor/sessions/:id` — история сообщений
```json
// Response 200
{
  "sessionId": "sess_1",
  "messages": [
    { "role": "student", "content": "...", "widget?: {} },
    { "role": "assistant", "content": "...", "widget?: {} }
  ],
  "summary": { "understood": [], "struggled": [], "recommendation": { "topic": "chain_rule", "difficulty": "basic" } }
}
```

### Function Calling (внутренний, не в API)
- `update_student_profile(goals, level, preferences)` → `PUT /students/:id`
- `get_knowledge_state(studentId)` → `GET /students/:id/knowledge`
- `search_materials(query, topicId)` → RAG (pgvector)

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

### `GET /classes/:id/overview` — дашборд класса
```json
// Response 200
{
  "classMastery": 0.64,
  "strongTopics": [{ "topicId": "top_1", "topicName": "Functions", "mastery": 0.81 }],
  "weakTopics": [{ "topicId": "top_2", "topicName": "Chain Rule", "mastery": 0.43 }],
  "studentsNeedingRemediation": 12,
  "heatmap": [                    // Ученики × Темы
    { "studentId": "s_1", "studentName": "Алтаир", "topics": { "top_1": 0.81, "top_2": 0.41 } }
  ]
}
```

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
  ],
  "voiceFeedbackAlerts": 2
}
```

---

## 9. AI Teacher Orchestrator

### `POST /orchestrator/query` — вопрос учителю от ИИ
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
{ "id": "rec_1", "status": "approved" }
```
> Создаёт `assignments` + `student_assignments` на основе `payload`.

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
{ "assignmentId": "asg_1", "studentAssignments": [...] }
```

### `GET /assignments/:id` — детали задания

### `POST /student-assignments/:id/submit` — ученик сдаёт (ONLINE: ответ, OFFLINE: "Сдал в классе")
```json
// Request (ONLINE)
{ "answers": [{ "taskId": "t_5", "answer": "..." }] }
// Request (OFFLINE)
{ "submittedInClass": true }

// Response 200
{ "status": "AI_GRADED" | "PENDING_VERIFICATION" }
```

### `POST /student-assignments/:id/verify` — учитель проверяет OFFLINE
```json
// Request
{ "action": "APPROVE" | "REJECT", "comment?: "Нужно перерешать" }
// Response 200 — { "status": "TEACHER_VERIFIED" | "REVISION_REQUIRED" }
```

---

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

Если заголовок присутствует:
- LLM/RAG/Orchestrator ответы берутся из Redis кэша
- Имитация задержки 300-400ms
- Реальные провайдеры не вызываются

---

## 14. Rate Limiting & Security

- `@nestjs/throttler` + Redis sliding window
- Auth endpoints: 10 req/min
- Tutor messages: 20/hr (автономный) / 50/hr (школьный)
- Voice: 5/hr (автономный) / 20/hr (школьный)
- Prompt Injection Guard: пользовательский ввод в теги `[STUDENT_INPUT_START]...[STUDENT_INPUT_END]`

---

## 15. Что НЕ в контракте (планируется после хакатона)

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
