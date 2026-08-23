import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();
const SUBJECT_NAME = 'Алгебра, 9 класс';
const DEMO_PASSWORD = 'password123';

const topicSeeds = [
  {
    name: 'Линейные уравнения',
    material: 'Линейное уравнение имеет вид ax + b = 0. Переносим свободный член и делим на коэффициент при x.',
    tasks: [
      ['easy', 'Решите уравнение: 2x + 6 = 0'],
      ['easy', 'Решите уравнение: 5x - 15 = 0'],
      ['medium', 'Решите уравнение: 3(x - 2) = 12'],
      ['medium', 'Решите уравнение: 7x + 4 = 3x - 8'],
      ['hard', 'Решите уравнение: (2x - 1) / 3 = 5'],
    ],
  },
  {
    name: 'Квадратные уравнения',
    material: 'Квадратное уравнение ax^2 + bx + c = 0 решается через дискриминант D = b^2 - 4ac.',
    tasks: [
      ['easy', 'Решите: x^2 - 9 = 0'],
      ['easy', 'Решите: x^2 - 5x + 6 = 0'],
      ['medium', 'Решите: x^2 + 4x + 3 = 0'],
      ['medium', 'Найдите дискриминант: 2x^2 - 3x + 1 = 0'],
      ['hard', 'Решите: 3x^2 - 10x + 3 = 0'],
    ],
  },
  {
    name: 'Системы уравнений',
    material: 'Систему линейных уравнений удобно решать методом подстановки или сложения.',
    tasks: [
      ['easy', 'Решите систему x + y = 5, x - y = 1'],
      ['easy', 'Решите систему x + y = 7, x = 4'],
      ['medium', 'Решите систему 2x + y = 7, x - y = 2'],
      ['medium', 'Решите систему 3x - y = 5, x + y = 3'],
      ['hard', 'Решите систему 2x + 3y = 13, 3x - 2y = 4'],
    ],
  },
  {
    name: 'Степени и корни',
    material: 'При умножении степеней с одинаковым основанием показатели складываются, а корень можно представить как степень 1/2.',
    tasks: [
      ['easy', 'Вычислите: 2^3 * 2^2'],
      ['easy', 'Вычислите: sqrt(49)'],
      ['medium', 'Упростите: a^5 / a^2'],
      ['medium', 'Вычислите: sqrt(12) + sqrt(27)'],
      ['hard', 'Упростите: (x^3)^4 / x^5'],
    ],
  },
  {
    name: 'Рациональные выражения',
    material: 'Рациональные выражения упрощаются разложением числителя и знаменателя на множители с учётом ОДЗ.',
    tasks: [
      ['easy', 'Сократите дробь: 6x / 3'],
      ['easy', 'Укажите ОДЗ выражения 1/(x-4)'],
      ['medium', 'Сократите: (x^2 - 9)/(x - 3)'],
      ['medium', 'Упростите: 1/x + 2/x'],
      ['hard', 'Решите: 2/(x-1) = 1'],
    ],
  },
  {
    name: 'Функции и графики',
    material: 'Функция задаёт соответствие между аргументом и значением. Линейная функция y = kx + b имеет график-прямую.',
    tasks: [
      ['easy', 'Найдите f(2), если f(x) = 3x + 1'],
      ['easy', 'Какой график имеет y = 2x + 1?'],
      ['medium', 'Найдите нуль функции y = 4x - 8'],
      ['medium', 'Найдите угловой коэффициент y = -3x + 5'],
      ['hard', 'Запишите функцию прямой через точки (0, 2) и (3, 8)'],
    ],
  },
  {
    name: 'Последовательности',
    material: 'В арифметической прогрессии каждый следующий член отличается на постоянную разность d.',
    tasks: [
      ['easy', 'Найдите 5-й член: 2, 5, 8, ...'],
      ['easy', 'Найдите разность прогрессии: 7, 11, 15, ...'],
      ['medium', 'Найдите сумму первых 5 членов: 3, 6, 9, ...'],
      ['medium', 'Найдите a10, если a1 = 4 и d = 3'],
      ['hard', 'Найдите n, если an = 2n + 1 и an = 21'],
    ],
  },
  {
    name: 'Вероятность и статистика',
    material: 'Вероятность равна отношению числа благоприятных исходов к числу всех равновозможных исходов.',
    tasks: [
      ['easy', 'Какова вероятность выпадения орла при броске монеты?'],
      ['easy', 'Найдите среднее чисел 2, 4 и 6'],
      ['medium', 'В мешке 3 красных и 2 синих шара. Вероятность красного?'],
      ['medium', 'Найдите медиану ряда 1, 3, 4, 8, 10'],
      ['hard', 'Бросают кубик. Вероятность числа больше 4?'],
    ],
  },
] as const;

async function upsertDemoUser(input: {
  email: string;
  name: string;
  role: Role;
  phone?: string;
}) {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  return prisma.user.upsert({
    where: { email: input.email },
    update: { name: input.name, role: input.role, phone: input.phone },
    create: { ...input, passwordHash },
  });
}

async function upsertTopic(subjectId: string, name: string, index: number) {
  const existing = await prisma.topic.findFirst({ where: { subjectId, name } });
  const previousTopic = index > 0 ? topicSeeds[index - 1].name : undefined;
  const prerequisiteIds = previousTopic
    ? [
        (await prisma.topic.findFirstOrThrow({ where: { subjectId, name: previousTopic } })).id,
      ]
    : [];

  if (existing) {
    return prisma.topic.update({
      where: { id: existing.id },
      data: { prerequisites: prerequisiteIds },
    });
  }

  return prisma.topic.create({
    data: { subjectId, name, prerequisites: prerequisiteIds },
  });
}

async function upsertMaterial(topicId: string, content: string) {
  const metadata = { source: 'seed', language: 'ru', type: 'lesson-notes' };
  const existing = await prisma.materialVector.findFirst({ where: { topicId } });
  const embedding = `[${Array(1536).fill(0).join(',')}]`;
  if (existing) {
    await prisma.$executeRaw`
      UPDATE "MaterialVector"
      SET content = ${content}, metadata = ${JSON.stringify(metadata)}::jsonb, embedding = ${embedding}::vector
      WHERE id = ${existing.id}
    `;
  } else {
    await prisma.$executeRaw`
      INSERT INTO "MaterialVector" (id, "topicId", content, metadata, embedding)
      VALUES (${randomUUID()}, ${topicId}, ${content}, ${JSON.stringify(metadata)}::jsonb, ${embedding}::vector)
    `;
  }
}

async function main() {
  const studentUser = await upsertDemoUser({
    email: 'demo_student@hackathon.com',
    name: 'Demo Student',
    role: Role.STUDENT,
  });
  const teacherUser = await upsertDemoUser({
    email: 'demo_teacher@hackathon.com',
    name: 'Demo Teacher',
    role: Role.TEACHER,
  });

  await prisma.student.upsert({
    where: { userId: studentUser.id },
    update: { grade: 9, goals: [{ subject: 'math', target: 'ЕНТ' }], preferences: { language: 'ru' } },
    create: {
      userId: studentUser.id,
      grade: 9,
      goals: [{ subject: 'math', target: 'ЕНТ' }],
      preferences: { language: 'ru' },
    },
  });
  await prisma.teacher.upsert({
    where: { userId: teacherUser.id },
    update: {},
    create: { userId: teacherUser.id },
  });

  const subject = await prisma.subject.upsert({
    where: { name: SUBJECT_NAME },
    update: {},
    create: { name: SUBJECT_NAME },
  });

  for (const [index, topicSeed] of topicSeeds.entries()) {
    const topic = await upsertTopic(subject.id, topicSeed.name, index);
    await upsertMaterial(topic.id, topicSeed.material);

    for (const [difficulty, content] of topicSeed.tasks) {
      const existingTask = await prisma.task.findFirst({ where: { topicId: topic.id, content } });
      if (existingTask) {
        await prisma.task.update({
          where: { id: existingTask.id },
          data: { difficulty, source: 'seed' },
        });
      } else {
        await prisma.task.create({
          data: { topicId: topic.id, difficulty, content, source: 'seed' },
        });
      }
    }
  }

  console.info(`Seed complete: ${topicSeeds.length} topics and ${topicSeeds.length * 5} tasks`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
