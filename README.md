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

- Backend: `http://localhost:3000/v1`
- Swagger: `http://localhost:3000/api/docs`
- Test client: `http://localhost:3001`

## Demo accounts

| Role | Email | Password |
|---|---|---|
| Student | `demo_student@hackathon.com` | `password123` |
| Teacher | `demo_teacher@hackathon.com` | `password123` |

Seed создаёт «Алгебра, 9 класс» и «Геометрия, 9 класс»: по 8 тем, 40 задач и 8 vector materials на предмет.

## MVP limitation

До согласованного schema patch `Task.correctAnswer` endpoint попытки использует временный mock-checker: ответы `correct` и `правильно` считаются верными. EMA, учёт попыток и сохранение `MistakeType` работают на backend; после schema patch mock будет заменён на реальную проверку ответа.
