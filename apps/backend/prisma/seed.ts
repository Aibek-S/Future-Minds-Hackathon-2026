import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();
const DEMO_PASSWORD = 'password123';
const EMBEDDING_DIMENSIONS = 1536;

const algebraTopicSeeds = [
  {
    name: 'Линейные уравнения',
    material: 'Линейное уравнение имеет вид ax + b = 0. Переносим свободный член и делим на коэффициент при x.',
    tasks: [
      ['easy', 'Решите уравнение: 2x + 6 = 0', 'x = -3'],
      ['easy', 'Решите уравнение: 5x - 15 = 0', 'x = 3'],
      ['medium', 'Решите уравнение: 3(x - 2) = 12', 'x = 6'],
      ['medium', 'Решите уравнение: 7x + 4 = 3x - 8', 'x = -3'],
      ['hard', 'Решите уравнение: (2x - 1) / 3 = 5', 'x = 8'],
    ],
  },
  {
    name: 'Квадратные уравнения',
    material: 'Квадратное уравнение ax^2 + bx + c = 0 решается через дискриминант D = b^2 - 4ac.',
    tasks: [
      ['easy', 'Решите: x^2 - 9 = 0', 'x = 3 | x = -3'],
      ['easy', 'Решите: x^2 - 5x + 6 = 0', 'x = 2 | x = 3'],
      ['medium', 'Решите: x^2 + 4x + 3 = 0', 'x = -1 | x = -3'],
      ['medium', 'Найдите дискриминант: 2x^2 - 3x + 1 = 0', 'D = 1'],
      ['hard', 'Решите: 3x^2 - 10x + 3 = 0', 'x = 3 | x = 1/3'],
    ],
  },
  {
    name: 'Системы уравнений',
    material: 'Систему линейных уравнений удобно решать методом подстановки или сложения.',
    tasks: [
      ['easy', 'Решите систему x + y = 5, x - y = 1', 'x = 3, y = 2'],
      ['easy', 'Решите систему x + y = 7, x = 4', 'x = 4, y = 3'],
      ['medium', 'Решите систему 2x + y = 7, x - y = 2', 'x = 3, y = 1'],
      ['medium', 'Решите систему 3x - y = 5, x + y = 3', 'x = 2, y = 1'],
      ['hard', 'Решите систему 2x + 3y = 13, 3x - 2y = 4', 'x = 2, y = 3'],
    ],
  },
  {
    name: 'Степени и корни',
    material: 'При умножении степеней с одинаковым основанием показатели складываются, а корень можно представить как степень 1/2.',
    tasks: [
      ['easy', 'Вычислите: 2^3 * 2^2', '32'],
      ['easy', 'Вычислите: sqrt(49)', '7'],
      ['medium', 'Упростите: a^5 / a^2', 'a^3'],
      ['medium', 'Вычислите: sqrt(12) + sqrt(27)', '5*sqrt(3)'],
      ['hard', 'Упростите: (x^3)^4 / x^5', 'x^7'],
    ],
  },
  {
    name: 'Рациональные выражения',
    material: 'Рациональные выражения упрощаются разложением числителя и знаменателя на множители с учётом ОДЗ.',
    tasks: [
      ['easy', 'Сократите дробь: 6x / 3', '2x'],
      ['easy', 'Укажите ОДЗ выражения 1/(x-4)', 'x ≠ 4'],
      ['medium', 'Сократите: (x^2 - 9)/(x - 3)', 'x + 3'],
      ['medium', 'Упростите: 1/x + 2/x', '3/x'],
      ['hard', 'Решите: 2/(x-1) = 1', 'x = 3'],
    ],
  },
  {
    name: 'Функции и графики',
    material: 'Функция задаёт соответствие между аргументом и значением. Линейная функция y = kx + b имеет график-прямую.',
    tasks: [
      ['easy', 'Найдите f(2), если f(x) = 3x + 1', '7'],
      ['easy', 'Какой график имеет y = 2x + 1?', 'прямая'],
      ['medium', 'Найдите нуль функции y = 4x - 8', 'x = 2'],
      ['medium', 'Найдите угловой коэффициент y = -3x + 5', '-3'],
      ['hard', 'Запишите функцию прямой через точки (0, 2) и (3, 8)', 'y = 2x + 2'],
    ],
  },
  {
    name: 'Последовательности',
    material: 'В арифметической прогрессии каждый следующий член отличается на постоянную разность d.',
    tasks: [
      ['easy', 'Найдите 5-й член: 2, 5, 8, ...', '14'],
      ['easy', 'Найдите разность прогрессии: 7, 11, 15, ...', '4'],
      ['medium', 'Найдите сумму первых 5 членов: 3, 6, 9, ...', '45'],
      ['medium', 'Найдите a10, если a1 = 4 и d = 3', '31'],
      ['hard', 'Найдите n, если an = 2n + 1 и an = 21', '10'],
    ],
  },
  {
    name: 'Вероятность и статистика',
    material: 'Вероятность равна отношению числа благоприятных исходов к числу всех равновозможных исходов.',
    tasks: [
      ['easy', 'Какова вероятность выпадения орла при броске монеты?', '1/2'],
      ['easy', 'Найдите среднее чисел 2, 4 и 6', '4'],
      ['medium', 'В мешке 3 красных и 2 синих шара. Вероятность красного?', '3/5'],
      ['medium', 'Найдите медиану ряда 1, 3, 4, 8, 10', '4'],
      ['hard', 'Бросают кубик. Вероятность числа больше 4?', '1/3'],
    ],
  },
] as const;

const geometryTopicSeeds = [
  {
    name: 'Треугольники',
    material: 'Сумма углов треугольника равна 180 градусам. По двум сторонам и углу между ними можно определить треугольник.',
    tasks: [
      ['easy', 'Найдите третий угол треугольника с углами 50 и 60 градусов', '70'],
      ['easy', 'Найдите периметр треугольника со сторонами 3, 4 и 5', '12'],
      ['medium', 'Найдите площадь прямоугольного треугольника с катетами 6 и 8', '24'],
      ['medium', 'В равнобедренном треугольнике угол при вершине равен 40 градусов. Найдите углы при основании', '70'],
      ['hard', 'Найдите сторону по теореме косинусов при a=5, b=7 и угле между ними 60 градусов', 'sqrt(39)'],
    ],
  },
  {
    name: 'Четырёхугольники',
    material: 'Сумма внутренних углов выпуклого четырёхугольника равна 360 градусам. У параллелограмма противоположные стороны и углы равны.',
    tasks: [
      ['easy', 'Найдите площадь прямоугольника со сторонами 5 и 8', '40'],
      ['easy', 'Найдите периметр квадрата со стороной 7', '28'],
      ['medium', 'Найдите площадь параллелограмма с основанием 9 и высотой 4', '36'],
      ['medium', 'Найдите диагональ прямоугольника со сторонами 6 и 8', '10'],
      ['hard', 'Найдите площадь ромба с диагоналями 10 и 12', '60'],
    ],
  },
  {
    name: 'Окружность и круг',
    material: 'Длина окружности равна 2piR, а площадь круга равна piR^2. Центральный угол опирается на дугу той же величины.',
    tasks: [
      ['easy', 'Найдите длину окружности радиуса 3 через pi', '6*pi'],
      ['easy', 'Найдите площадь круга радиуса 4 через pi', '16*pi'],
      ['medium', 'Найдите радиус окружности длиной 10pi', '5'],
      ['medium', 'Найдите длину дуги в 90 градусов окружности радиуса 8', '4*pi'],
      ['hard', 'Найдите площадь сектора с радиусом 6 и углом 120 градусов', '12*pi'],
    ],
  },
  {
    name: 'Подобие фигур',
    material: 'Подобные фигуры имеют равные соответствующие углы и пропорциональные стороны. Коэффициент площадей равен квадрату коэффициента подобия.',
    tasks: [
      ['easy', 'Стороны подобных фигур относятся как 2:3. Чему равен коэффициент подобия?', '2/3'],
      ['easy', 'Найдите неизвестную сторону: 3/5 = x/20', '12'],
      ['medium', 'Периметр первой фигуры 18, коэффициент подобия 2. Найдите периметр второй', '36'],
      ['medium', 'Площади подобных фигур относятся как 4:9. Найдите отношение сторон', '2/3'],
      ['hard', 'На карте масштаб 1:100000. Каково расстояние на местности для 7 см?', '7 км | 7km | 700000 см'],
    ],
  },
  {
    name: 'Векторы',
    material: 'Вектор задаётся направлением и длиной. Координаты суммы векторов складываются покомпонентно.',
    tasks: [
      ['easy', 'Найдите сумму векторов (2, 3) и (1, 4)', '(3, 7)'],
      ['easy', 'Найдите длину вектора (3, 4)', '5'],
      ['medium', 'Найдите координаты вектора AB для A(1, 2) и B(5, 7)', '(4, 5)'],
      ['medium', 'Скалярное произведение векторов (2, 1) и (3, 4)', '10'],
      ['hard', 'При каком значении x векторы (x, 2) и (3, -6) перпендикулярны?', 'x = 4'],
    ],
  },
  {
    name: 'Координатная геометрия',
    material: 'Расстояние между точками вычисляется по теореме Пифагора через разности координат, а середина отрезка находится усреднением координат.',
    tasks: [
      ['easy', 'Найдите расстояние между точками (0, 0) и (3, 4)', '5'],
      ['easy', 'Найдите середину отрезка с концами (2, 4) и (6, 8)', '(4, 6)'],
      ['medium', 'Запишите уравнение прямой с угловым коэффициентом 2 через точку (0, 3)', 'y = 2x + 3'],
      ['medium', 'Найдите координаты точки пересечения y=2x и y=x+4', '(4, 8)'],
      ['hard', 'Найдите уравнение окружности с центром (2, -1) и радиусом 3', '(x-2)^2 + (y+1)^2 = 9'],
    ],
  },
  {
    name: 'Площади и объёмы',
    material: 'Площадь призмы и цилиндра связана с площадью основания и высотой. Объём прямоугольного параллелепипеда равен произведению трёх измерений.',
    tasks: [
      ['easy', 'Найдите объём куба с ребром 3', '27'],
      ['easy', 'Найдите объём параллелепипеда со сторонами 2, 3 и 5', '30'],
      ['medium', 'Найдите площадь полной поверхности куба с ребром 4', '96'],
      ['medium', 'Найдите объём цилиндра радиуса 3 и высоты 5 через pi', '45*pi'],
      ['hard', 'Найдите высоту призмы объёмом 120 и площадью основания 15', '8'],
    ],
  },
  {
    name: 'Теорема Пифагора',
    material: 'В прямоугольном треугольнике квадрат гипотенузы равен сумме квадратов катетов: c^2 = a^2 + b^2.',
    tasks: [
      ['easy', 'Найдите гипотенузу по катетам 3 и 4', '5'],
      ['easy', 'Найдите катет по гипотенузе 5 и катету 3', '4'],
      ['medium', 'Проверьте, является ли треугольник со сторонами 6, 8 и 10 прямоугольным', 'да | yes'],
      ['medium', 'Найдите диагональ квадрата со стороной 5', '5*sqrt(2)'],
      ['hard', 'Лестница 13 м отстоит от стены на 5 м. На какую высоту она достаёт?', '12'],
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

async function upsertTopic(subjectId: string, seeds: readonly { name: string }[], name: string, index: number) {
  const existing = await prisma.topic.findFirst({ where: { subjectId, name } });
  const previousTopic = index > 0 ? seeds[index - 1].name : undefined;
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

async function seedSubject(
  subjectName: string,
  seeds: readonly { name: string; material: string; tasks: readonly (readonly [string, string, string])[] }[],
) {
  const subject = await prisma.subject.upsert({
    where: { name: subjectName },
    update: {},
    create: { name: subjectName },
  });

  for (const [index, topicSeed] of seeds.entries()) {
    const topic = await upsertTopic(subject.id, seeds, topicSeed.name, index);
    await upsertMaterial(topic.id, topicSeed.material);

    for (const [difficulty, content, correctAnswer] of topicSeed.tasks) {
      const existingTask = await prisma.task.findFirst({ where: { topicId: topic.id, content } });
      if (existingTask) {
        await prisma.task.update({
          where: { id: existingTask.id },
          data: { difficulty, correctAnswer, source: 'seed' },
        });
      } else {
        await prisma.task.create({
          data: { topicId: topic.id, difficulty, content, correctAnswer, source: 'seed' },
        });
      }
    }
  }
}

async function upsertMaterial(topicId: string, content: string) {
  const metadata = { source: 'seed', language: 'ru', type: 'lesson-notes' };
  const existing = await prisma.materialVector.findFirst({ where: { topicId } });
  const embedding = toPgVector(createMockEmbedding(content));
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

/**
 * Temporary deterministic embedding for the demo seed.
 *
 * It is normalized and non-zero, so pgvector cosine operators and the IVFFlat
 * index work before a real embedding provider is connected. It is not intended
 * to provide semantic search quality.
 */
function createMockEmbedding(content: string): number[] {
  const vector = Array<number>(EMBEDDING_DIMENSIONS).fill(0);

  for (let index = 0; index < content.length; index += 1) {
    const code = content.charCodeAt(index);
    const bucket = (code * 31 + index * 17) % EMBEDDING_DIMENSIONS;
    vector[bucket] += 1;
  }

  const norm = Math.hypot(...vector);
  return vector.map((value) => value / norm);
}

function toPgVector(vector: number[]) {
  return `[${vector.join(',')}]`;
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

  await seedSubject('Алгебра, 9 класс', algebraTopicSeeds);
  await seedSubject('Геометрия, 9 класс', geometryTopicSeeds);

  console.info('Seed complete: 2 subjects, 16 topics and 80 tasks');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
