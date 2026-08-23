# Future Minds Hackathon 2026

MVP платформы персонализированного обучения: NestJS + Prisma + PostgreSQL/pgvector и функциональный Next.js клиент.

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
corepack pnpm dev
```

- Backend: `http://localhost:3002/v1` (порт из `PORT` в `apps/backend/.env`; дефолт 3002, т.к. 3000 часто занят)
- Swagger: `http://localhost:3002/api/docs`
- Test client: `http://localhost:3001`

## Demo accounts

| Role | Email | Password |
|---|---|---|
| Student | `demo_student@hackathon.com` | `password123` |
| Teacher | `demo_teacher@hackathon.com` | `password123` |

Seed создаёт «Алгебра, 9 класс» и «Геометрия, 9 класс»: по 8 тем, 40 задач и 8 vector materials на предмет.

## MVP limitation

Проверка ответов: каждая задача в seed имеет `correctAnswer` (варианты через `|`), ответ
сравнивается нормализованно (регистр, пробелы, необязательный префикс `x =`). Для задач
без `correctAnswer` сохраняется demo-режим (принимаются `correct` / `правильно`). Тема
открывается, когда mastery по всем пререквизитам превышает `0.4` (ТЗ §6.4).
