# Future Minds Hackathon 2026

**ZERTTE** — AI-платформа персонализированного обучения: NestJS + Prisma + PostgreSQL/pgvector и Next.js клиент (карта знаний, мастерство EMA, ИИ-наставник с SSE, дашборд учителя с heatmap и AI-планировщиком).

## Быстрый запуск

### 1. Клонирование и зависимости

```bash
git clone https://github.com/Aibek-S/Future-Minds-Hackathon-2026.git
cd Future-Minds-Hackathon-2026

corepack enable
corepack pnpm install
```

### 2. Docker (PostgreSQL + Redis)

Проект использует **hackathon-postgres** и **hackathon-redis** контейнеры.

```bash
docker compose up -d postgres redis
```

> **Важно:** `docker-compose.override.yml` маппит postgres на порт **5434** (не 5432), чтобы не конфликтовать с другими локальными PostgreSQL инстансами. Убедитесь, что порт 5434 свободен.

Проверка здоровья:

```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep hackathon
```

Ожидаемый вывод:

```
hackathon-postgres   Up (healthy)   0.0.0.0:5434->5432/tcp
hackathon-redis      Up (healthy)   0.0.0.0:6379->6379/tcp
```

### 3. pgvector extension

**Критически важно:** PostgreSQL контейнер должен иметь расширение `vector` для pgvector. Если миграции падают с ошибкой `type "vector" does not exist`, выполните:

```bash
docker exec hackathon-postgres psql -U postgres -d hackathon_ai_tutor -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

> Расширение создаётся автоматически при первом запуске из `init-pgvector.sql`, но если вы используете кастомный volume или ранее создавали БД без pgvector — выполните команду вручную.

### 4. Prisma (generate + push)

```bash
cd apps/backend
corepack pnpm db:generate   # генерация Prisma Client
corepack pnpm db:push       # применение схемы к БД
```

> **Не используйте `db:migrate deploy`** если pgvector extension не установлен — Prisma shadow database не имеет расширения и миграции упадут. `db:push` применяет схему напрямую без shadow database.

Если HNSW индекс для векторного поиска не создан (для семантического поиска материалов):

```bash
docker exec hackathon-postgres psql -U postgres -d hackathon_ai_tutor -c \
  "CREATE INDEX IF NOT EXISTS MaterialVector_embedding_hnsw_idx ON \"MaterialVector\" USING HNSW (\"embedding\" vector_cosine_ops);"
```

### 5. Seed данных

```bash
corepack pnpm db:seed
```

Создаёт:
- Demo student (`demo_student@hackathon.com`, пароль `password123`)
- Demo teacher (`demo_teacher@hackathon.com`, пароль `password123`)
- 2 предмета: «Алгебра, 9 класс» и «Геометрия, 9 класс»
- По 8 тем на предмет (цепочка пререквизитов)
- 40 задач на предмет (80 всего)
- 16 MaterialVector записей (mock-эмбеддинги 1536 dims, если `OPENAI_API_KEY` не задан)

> Если `OPENAI_API_KEY` пуст — используются mock-эмбеддинги. Для реальных эмбеддингов задайте ключ в `.env`.

### 6. Запуск бэкенда

```bash
corepack pnpm start
```

Backend: `http://localhost:3002/v1`
Swagger: `http://localhost:3002/api/docs`

### 7. Запуск фронтенда (отдельный терминал)

```bash
cd ../web
corepack pnpm install
corepack pnpm dev
```

Frontend: `http://localhost:3001`

> Переменная окружения web: `NEXT_PUBLIC_API_URL` (дефолт `http://localhost:3002/v1`).

---

## Демо-аккаунты

| Роль | Email | Пароль |
|---|---|---|
| Student | `demo_student@hackathon.com` | `password123` |
| Teacher | `demo_teacher@hackathon.com` | `password123` |

---

## Архитектура

```
apps/
├── backend/          # NestJS + Prisma + PostgreSQL
│   ├── src/
│   │   ├── ai/           # AI Gateway (tools, widgets, embeddings, prompts)
│   │   ├── modules/
│   │   │   ├── auth/           # JWT auth + refresh
│   │   │   ├── students/       # Student profiles, knowledge, roadmap
│   │   │   ├── topics/         # Topics, tasks, materials
│   │   │   ├── attempts/       # Answer checking (AnswerCheckerService)
│   │   │   ├── classes/        # Class management
│   │   │   ├── lessons/        # Lesson planning
│   │   │   ├── assignments/    # Homework workflow
│   │   │   ├── dashboard/      # Teacher analytics
│   │   │   ├── orchestrator/   # AI lesson planner
│   │   │   ├── chat/           # SSE streaming chat
│   │   │   ├── diagnostic/     # Diagnostic sessions
│   │   │   ├── feedback/       # Feedback sessions
│   │   │   ├── notifications/  # SSE notifications
│   │   │   ├── realtime/       # WebSocket gateway + Redis pub/sub
│   │   │   ├── voice-feedback/ # Voice upload + Whisper STT + GPT analysis
│   │   │   ├── admin/          # Admin metrics + user management
│   │   │   └── subjects/       # Subjects endpoint
│   │   └── prisma/
│   └── prisma/
│       ├── schema.prisma       # 28 моделей
│       ├── seed.ts
│       └── migrations/         # 6 миграций
├── web/              # Next.js 15 + React 19 + Tailwind CSS 4
│   ├── app/
│   │   ├── (auth)/             # login, register
│   │   ├── (student)/          # home, learn, practice, progress, tutor, shop, profile
│   │   ├── teacher/            # dashboard, classes/[id], planner, profile
│   │   ├── lesson/[topicId]/   # урок с задачами
│   │   ├── onboarding/
│   │   └── diagnostic/
│   ├── components/
│   │   ├── ai/                 # ChatPanel, ZereAvatar, widgets, markdown
│   │   ├── knowledge-tree/     # tree.tsx (serpentine layout), roadmap-panel
│   │   ├── layout/             # header, nav (sidebar)
│   │   ├── lesson/             # question, feedback
│   │   ├── ui/                 # button, card, modal, progress, states
│   │   └── ...
│   └── lib/
│       ├── api/                # client.ts (HTTP + JWT refresh), sse.ts
│       ├── services/           # auth, students, topics, tasks, classes, tutor, voice
│       ├── stores/             # zustand (gamification, language, onboarding)
│       ├── i18n/               # ru/en/kk словари
│       └── types.ts
└── docker-compose.yml
```

## Prisma Schema (28 моделей)

```
User, Student, Teacher, Class, Lesson, Subject, Topic, Task,
Attempt, StudentKnowledge, Mistake, Assignment, StudentAssignment,
TutorSession, TutorMessage, Feedback, AiRecommendation,
MaterialVector, MaterialIngestion, VoiceFeedback
```

Ключевые enum: `Role`, `SessionKind`, `VoiceFeedbackStatus`, `MaterialIngestionStatus`, `AssignmentMode`, `AssignmentStatus`, `MistakeType`

---

## Известные проблемы и решения

### `type "vector" does not exist`

Расширение pgvector не установлено. Решение:

```bash
docker exec hackathon-postgres psql -U postgres -d hackathon_ai_tutor -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

### `Migration failed to apply to the shadow database`

Prisma `migrate deploy` создаёт временную shadow database без pgvector. Используйте `db:push` вместо `db:migrate deploy`.

### HNSW индекс не создан

`db:push` не применяет raw SQL из миграций (HNSW index). Создайте вручную:

```bash
docker exec hackathon-postgres psql -U postgres -d hackathon_ai_tutor -c \
  "CREATE INDEX IF NOT EXISTS MaterialVector_embedding_hnsw_idx ON \"MaterialVector\" USING HNSW (\"embedding\" vector_cosine_ops);"
```

### Порт 5432 занят

`docker-compose.override.yml` маппит postgres на 5434. Убедитесь, что `.env` использует порт 5434:

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5434/hackathon_ai_tutor?schema=public"
```

### Node engine warning

Проект указывает `node: 20.x` в `engines`, но работает на Node 26+. Warning безопасен.

### `nest build` не находит `dist/main.js`

Убедитесь, что `pnpm build` выполнился успешно (без ошибок TypeScript). `dist/src/main.js` — правильный путь入口.

---

## AI Gateway

### Провайдеры

| Провайдер | `AI_PROVIDER` | Описание |
|---|---|---|
| Mock | `mock` | Локальные ответы без API ключей |
| OpenRouter | `openrouter` | Бесплатные модели через OpenRouter |
| DeepSeek | `deepseek` | DeepSeek API напрямую |

Для pitch-демо: `AI_PROVIDER=deepseek` + заполните `DEEPSEEK_API_KEY`.

### Голосовой ввод

- STT (Speech-to-Text) выполняется **на стороне клиента** (браузер Web Speech API)
- Бэкенд получает транскрипт и анализирует через AI Gateway
- Режимы: `VOICE_MODE=mock` (демо) или `VOICE_MODE=live` (реальный анализ)

### RAG (Retrieval-Augmented Generation)

- Эмбеддинги: OpenAI `text-embedding-3-small` (1536 dims)
- Хранение: PostgreSQL pgvector с HNSW индексом
- Materials векторизуются при seed (mock) или загрузке (реальные эмбеддинги)
- Semantic search: `GET /topics/:id/materials/search?q=...`

---

## Стек

| Компонент | Технология |
|---|---|
| Backend | NestJS 10, Prisma 5.22, PostgreSQL 16 + pgvector |
| Frontend | Next.js 15, React 19, Tailwind CSS 4, Zustand, TanStack Query |
| AI | OpenAI API (embeddings), OpenRouter (chat), Whisper (STT) |
| Realtime | WebSocket (Socket.IO) + Redis pub/sub |
| Queue | BullMQ (voice + material processing) |
| Fonts | Nunito (app), Comfortaa (display) |
| Animations | Framer Motion |
| Charts | Recharts |
| Math | KaTeX + remark-math |
