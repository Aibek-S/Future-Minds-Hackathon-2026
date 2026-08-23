# Аудит API-контракта v2

Дата: 2026-08-23  
Область: текущая реализация `apps/backend`, Prisma schema и контракт v2.

## Итог

Prisma schema уже содержит основу для Students, Topics/Tasks, Attempts, классов,
заданий и векторных материалов. Реализованы только Auth и инфраструктура Prisma.
Перед реализацией модулей необходим один schema patch для проверки решений на
сервере. Остальные schema-расхождения относятся к следующим блокам контракта и
не блокируют текущий MVP.

## Блок MVP: обязательные решения

| Контракт | Текущее состояние | Решение |
|---|---|---|
| `POST /tasks/:id/attempts` сам определяет `correct` по `answer` | У `Task` нет эталонного ответа | Добавить `correctAnswer String?` в `Task`; seed будет заполнять его для demo-задач. |
| `GET /auth/me` возвращает пользователя и вложенный Student/Teacher | JWT strategy возвращает только `{ userId, role }` | Исправить AuthService/AuthController без изменения schema. |
| Регистрация принимает `phone` | `User.phone` есть, но поля нет в DTO и сервисе | Добавить необязательный `phone` в RegisterDto и запись в `User`. |
| `grade` обязателен для STUDENT | DTO допускает отсутствие и сервис подставляет 9 | Добавить условную валидацию grade для STUDENT. |
| CRUD Topics/Tasks доступен Teacher/Admin | Общего role guard пока нет | Добавить минимальный `Roles` decorator + guard в шаге Topics. |
| `difficulty` только `easy`, `medium`, `hard` | В БД свободная строка | Валидировать DTO enum; миграция enum не требуется для MVP. |

## Seed и pgvector

`MaterialVector.embedding` объявлен как `Unsupported("vector(1536)")`. Prisma
Client не может передать это поле в `create`, поэтому seed создаёт запись
параметризованным `$executeRaw` с нулевым вектором размерности 1536. Это
соответствует текущему Docker PostgreSQL с pgvector и не требует изменения schema.

Seed должен быть идемпотентным и создавать:

- `demo_student@hackathon.com` и `demo_teacher@hackathon.com`;
- Subject «Алгебра, 9 класс»;
- 8 тем, около 40 задач и по одному материалу на тему.

## Расхождения следующих блоков контракта

Эти пункты не блокируют текущую последовательность работ, но должны быть
согласованы до реализации соответствующих модулей.

| Блок | Расхождение | Предлагаемое решение |
|---|---|---|
| Assignments | Контракт содержит `dueDate`, в `Assignment` поля нет | Добавить `dueDate DateTime?`. |
| Tutor | Создание сессии принимает `topicId`, но `TutorSession` его не хранит | Добавить `topicId String?` и relation к Topic, если тема нужна в истории/аналитике. |
| Tutor history | Контракт возвращает `summary`, schema его не хранит | Для mock MVP вычислять summary при запросе; перед production решить, нужно ли хранение. |
| Voice feedback | Нет модели статуса, transcript и analysis | Добавить отдельную модель при реализации Voice блока. |
| API errors | Контракт требует единый `{ error: { code, message, details } }` | Добавить global exception filter отдельным инфраструктурным коммитом. |
| Rate limiting | Глобальный throttler есть, лимиты endpoints/Redis sliding window отсутствуют | Настроить при реализации Tutor/Voice. |

## Техническая проверка миграций

Файл `prisma/migrations/20260823_init_schema/migration.sql` содержит только
baseline-комментарий, поэтому для чистой БД текущая schema не будет создана через
`prisma migrate deploy`. До первого релиза нужно либо создать настоящую initial
migration, либо явно использовать `prisma db push` в dev-setup. Для хакатонного
MVP предпочтителен `prisma db push` в `setup.sh`; production migration следует
сформировать отдельным согласованным шагом.

## Порядок после аудита

1. Согласовать с Айбеком schema patch `Task.correctAnswer`.
2. Реализовать demo accounts и seed предмета.
3. Добавить темы, задачи и vector materials в seed.
4. Перейти к Students API и тестовому фронту по готовым endpoints.
