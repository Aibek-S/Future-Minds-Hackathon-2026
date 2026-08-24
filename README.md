# Future Minds Hackathon 2026

**ZERTTE** — AI-платформа персонализированного обучения: NestJS + Prisma + PostgreSQL/pgvector и Next.js клиент (карта знаний, мастерство EMA, ИИ-наставник с SSE, дашборд учителя с heatmap и AI-планировщиком).

## Быстрый запуск

```powershell
corepack enable
corepack pnpm install
./setup.sh

cd apps/backend
corepack pnpm db:seed
corepack pnpm start
```

Во втором терминале:

```powershell
cd apps/web
npm install
npm run dev
```

- Backend: `http://localhost:3002/v1` (порт из `PORT` в `apps/backend/.env`; дефолт 3002, т.к. 3000 часто занят)
- Swagger: `http://localhost:3002/api/docs`
- Web (ZERTTE): `http://localhost:3001`

Переменная окружения web: `NEXT_PUBLIC_API_URL` (дефолт `http://localhost:3002/v1`).

## Demo accounts

| Role | Email | Password |
|---|---|---|
| Student | `demo_student@hackathon.com` | `password123` |
| Teacher | `demo_teacher@hackathon.com` | `password123` |

Seed создаёт «Алгебра, 9 класс» и «Геометрия, 9 класс»: по 8 тем (линейная цепочка пререквизитов), 40 задач и 8 vector materials на предмет.

## Web (apps/web) — кратко

- Студент: онбординг → диагностика (ИИ reverse-asking) → карта знаний (реальные `prerequisites`) → иммерсивный урок с фидбеком `masteryBefore→After`, разблокировками и контекстным «Спросить ИИ» → прогресс/практика/ИИ-тьютор/магазин(soon)/профиль. UI-языки RU/KK/EN (`lib/i18n`), язык контента — отдельно.
- Учитель: KPI класса, тепловая карта (≥70 зелёный / ≥40 жёлтый / <40 красный), ученики со статусами, уроки + верификация ДЗ, выдача домашних заданий, контент, ИИ-планировщик (оркестратор → CONFIRM → approve создаёт урок).
- Streak 🔥 и монеты 🪙 — изолированный placeholder (`lib/stores/gamification.ts`, `isPlaceholder: true`); mastery — только реальные данные бэкенда.

## MVP limitation

Проверка ответов: каждая задача в seed имеет `correctAnswer` (варианты через `|`), ответ
сравнивается нормализованно (регистр, пробелы, необязательный префикс `x =`). Для задач
без `correctAnswer` сохраняется demo-режим (принимаются `correct` / `правильно`). Тема
открывается, когда mastery по всем пререквизитам превышает `0.4` (ТЗ §6.4).
