import type { UiLanguage } from "../types";

/**
 * UI language dictionaries. Educational content is NEVER translated here —
 * content language is requested from the backend separately
 * (see `contentLanguage` in student preferences).
 */
export const dictionaries = {
  ru: {
    brand: "ZERTTE",
    nav: {
      home: "Главная",
      learn: "Учиться",
      roadmap: "Карта",
      practice: "Практика",
      progress: "Прогресс",
      tutor: "ИИ-наставник",
      shop: "Магазин",
      profile: "Профиль",
      ai: "ИИ",
    },
    common: {
      continue: "Продолжить",
      start: "Начать",
      retry: "Попробовать снова",
      loading: "Загружаем…",
      back: "Назад",
      close: "Закрыть",
      save: "Сохранить",
      cancel: "Отмена",
      mastery: "Мастерство",
      difficulty: "Сложность",
      topics: "тем",
      complete: "пройдено",
      language: "Язык",
      logout: "Выйти",
    },
    difficulty: { easy: "Лёгкая", medium: "Средняя", hard: "Сложная" },
    trend: { improving: "растёт", stable: "стабильно", declining: "снижается" },
    auth: {
      loginTitle: "С возвращением",
      loginSubtitle: "Продолжим обучение с того места, где вы остановились.",
      registerTitle: "Создать аккаунт",
      registerSubtitle: "ZERTTE построит для вас персональный путь обучения.",
      email: "Электронная почта",
      password: "Пароль",
      name: "Имя",
      grade: "Класс",
      role: "Я —",
      student: "Ученик",
      teacher: "Учитель",
      login: "Войти",
      register: "Зарегистрироваться",
      noAccount: "Нет аккаунта?",
      haveAccount: "Уже есть аккаунт?",
      failed: "Не удалось войти. Проверьте почту и пароль.",
    },
    onboarding: {
      title: "Настроим ZERTTE под вас",
      stepLanguage: "На каком языке учиться?",
      stepGrade: "В каком вы классе?",
      stepSubjects: "Какие предметы вам интересны?",
      stepGoals: "Какая у вас цель?",
      stepDiagnostic: "Проверим, что вы уже знаете",
      diagnosticNote:
        "Короткая диагностика — 8 вопросов. Она покажет ваш текущий уровень и точку старта.",
      startDiagnostic: "Начать диагностику",
      step: "Шаг",
      of: "из",
    },
    diagnostic: {
      title: "Давайте поймём, что вы уже знаете",
      question: "Вопрос",
      dontKnow: "Не знаю",
      yourProfile: "Ваш профиль знаний",
      recommendedStart: "Рекомендуемая точка старта",
      startLearning: "Начать обучение",
      analyzing: "Анализируем ваши ответы…",
    },
    learn: {
      yourSubjects: "Ваши предметы",
      continueLabel: "Продолжить",
      noSubjects: "Пока нет предметов",
      noSubjectsHint: "Давайте подберём для вас правильный путь обучения.",
      section: "РАЗДЕЛ",
      unit: "БЛОК",
      guidebook: "Справочник",
      knowledgeTree: "Дерево знаний",
    },
    topic: {
      whyThis: "Почему эта тема?",
      startLesson: "Начать урок",
      locked: "Тема закрыта",
      lockedHint: "Сначала завершите предыдущие темы.",
      blockedBy: "Требуется",
      attempts: "попыток",
      current: "Текущая тема",
      completed: "Пройдено",
      unlocked: "Открыта",
    },
    lesson: {
      checkAnswer: "Проверить ответ",
      askAi: "Спросить ИИ",
      yourAnswer: "Ваш ответ",
      correct: "Отлично!",
      incorrect: "Почти получилось.",
      nextDifficulty: "Следующая сложность",
      unlockedTopic: "Новая тема открыта!",
      tryAgain: "Попробовать снова",
      explainMore: "Объяснить подробнее",
      finish: "Завершить",
      finished: "Урок завершён",
      noTasks: "Для этой темы пока нет заданий.",
      exitConfirm: "Выйти из урока?",
      mistake: {
        CALCULATION_ERROR: "Похоже на вычислительную ошибку.",
        CONCEPTUAL_ERROR: "Похоже на ошибку в понимании концепции.",
        READING_ERROR: "Похоже, условие прочитано неточно.",
      },
    },
    tutor: {
      title: "ИИ-наставник",
      greeting: "Привет",
      whatWorking: "Над чем работаем?",
      placeholder: "Спросите что угодно…",
      contextTitle: "Контекст обучения",
      send: "Отправить",
      thinking: "Думаю…",
    },
    progress: {
      title: "Прогресс",
      overall: "Общее мастерство",
      bySubject: "По предметам",
      byTopic: "По темам",
      recentActivity: "Последняя активность",
      noActivity: "Активности пока нет.",
    },
    practice: {
      title: "Практика",
      subtitle: "Отработайте темы со слабым мастерством.",
      weakest: "Слабые темы",
      practiceNow: "Практиковать",
    },
    shop: {
      title: "Магазин",
      comingSoon: "Скоро",
      avatars: "Аватары",
      themes: "Темы оформления",
      cosmetics: "Косметика",
      boosters: "Бустеры",
      note: "Магазин появится, когда будет готова серверная часть.",
    },
    profile: {
      title: "Профиль",
      stats: "Статистика обучения",
      preferences: "Настройки",
      grade: "Класс",
      overallMastery: "Общее мастерство",
      streak: "Серия",
      coins: "Монеты",
      subjects: "Предметы",
    },
    gamification: {
      streak: "дней подряд",
      coins: "монеты",
      placeholder: "Скоро будет синхронизировано с сервером",
    },
    errors: {
      title: "Что-то пошло не так",
      body: "Не удалось загрузить данные. Попробуйте ещё раз.",
    },
  },
};

export type Dictionary = typeof dictionaries.ru;

/**
 * EN and KK dictionaries are structurally identical to RU.
 * They are declared as partial overlays so untranslated keys fall back to RU
 * instead of rendering an empty string.
 */
export const overlays: Record<Exclude<UiLanguage, "ru">, DeepPartial<Dictionary>> = {
  en: {
    nav: {
      home: "Home",
      learn: "Learn",
      roadmap: "Roadmap",
      practice: "Practice",
      progress: "Progress",
      tutor: "AI Tutor",
      shop: "Shop",
      profile: "Profile",
      ai: "AI",
    },
    common: {
      continue: "Continue",
      start: "Start",
      retry: "Try again",
      loading: "Loading…",
      back: "Back",
      close: "Close",
      save: "Save",
      cancel: "Cancel",
      mastery: "Mastery",
      difficulty: "Difficulty",
      topics: "topics",
      complete: "complete",
      language: "Language",
      logout: "Log out",
    },
    difficulty: { easy: "Easy", medium: "Medium", hard: "Hard" },
    trend: { improving: "improving", stable: "stable", declining: "declining" },
    learn: {
      yourSubjects: "Your subjects",
      continueLabel: "Continue",
      noSubjects: "No subjects yet",
      noSubjectsHint: "Let's find the right learning path for you.",
      section: "SECTION",
      unit: "UNIT",
      guidebook: "Guidebook",
      knowledgeTree: "Knowledge tree",
    },
    topic: {
      whyThis: "Why this topic?",
      startLesson: "Start lesson",
      locked: "Topic locked",
      lockedHint: "Finish the previous topics first.",
      blockedBy: "Requires",
      attempts: "attempts",
      current: "Current topic",
      completed: "Completed",
      unlocked: "Unlocked",
    },
    lesson: {
      checkAnswer: "Check answer",
      askAi: "Ask AI",
      yourAnswer: "Your answer",
      correct: "Great job!",
      incorrect: "Not quite.",
      nextDifficulty: "Next difficulty",
      unlockedTopic: "New topic unlocked!",
      tryAgain: "Try again",
      explainMore: "Explain more",
      finish: "Finish",
      finished: "Lesson complete",
      noTasks: "No tasks for this topic yet.",
      exitConfirm: "Leave the lesson?",
    },
    tutor: {
      title: "AI Tutor",
      greeting: "Hey",
      whatWorking: "What are we working on?",
      placeholder: "Ask anything…",
      contextTitle: "Learning context",
      send: "Send",
      thinking: "Thinking…",
    },
    progress: {
      title: "Progress",
      overall: "Overall mastery",
      bySubject: "By subject",
      byTopic: "By topic",
      recentActivity: "Recent activity",
      noActivity: "No activity yet.",
    },
    shop: {
      title: "Shop",
      comingSoon: "Coming soon",
      avatars: "Avatars",
      themes: "Themes",
      cosmetics: "Cosmetics",
      boosters: "Boosters",
      note: "The shop opens once the backend supports it.",
    },
  },
  kk: {
    nav: {
      home: "Басты бет",
      learn: "Оқу",
      roadmap: "Карта",
      practice: "Жаттығу",
      progress: "Прогресс",
      tutor: "ЖИ-ұстаз",
      shop: "Дүкен",
      profile: "Профиль",
      ai: "ЖИ",
    },
    common: {
      continue: "Жалғастыру",
      start: "Бастау",
      retry: "Қайта көру",
      loading: "Жүктелуде…",
      back: "Артқа",
      close: "Жабу",
      save: "Сақтау",
      cancel: "Болдырмау",
      mastery: "Меңгеру",
      difficulty: "Күрделілік",
      topics: "тақырып",
      complete: "аяқталды",
      language: "Тіл",
      logout: "Шығу",
    },
    difficulty: { easy: "Жеңіл", medium: "Орташа", hard: "Қиын" },
    learn: {
      yourSubjects: "Пәндеріңіз",
      continueLabel: "Жалғастыру",
      noSubjects: "Әзірге пән жоқ",
      noSubjectsHint: "Сізге лайық оқу жолын таңдайық.",
      section: "БӨЛІМ",
      unit: "БЛОК",
      guidebook: "Анықтамалық",
      knowledgeTree: "Білім ағашы",
    },
    topic: {
      whyThis: "Неге осы тақырып?",
      startLesson: "Сабақты бастау",
      locked: "Тақырып жабық",
      lockedHint: "Алдымен алдыңғы тақырыптарды аяқтаңыз.",
      blockedBy: "Қажет",
      attempts: "әрекет",
      current: "Ағымдағы тақырып",
      completed: "Аяқталды",
      unlocked: "Ашық",
    },
    lesson: {
      checkAnswer: "Жауапты тексеру",
      askAi: "ЖИ-ден сұрау",
      correct: "Керемет!",
      incorrect: "Дәл емес.",
      tryAgain: "Қайта көру",
      explainMore: "Толығырақ түсіндір",
      finish: "Аяқтау",
      finished: "Сабақ аяқталды",
    },
    tutor: {
      title: "ЖИ-ұстаз",
      greeting: "Сәлем",
      whatWorking: "Немен айналысамыз?",
      placeholder: "Кез келген сұрақ қойыңыз…",
      send: "Жіберу",
      thinking: "Ойлануда…",
    },
  },
};

export type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

function merge<T>(base: T, overlay: DeepPartial<T>): T {
  const out = { ...base } as Record<string, unknown>;
  for (const [key, value] of Object.entries(overlay as Record<string, unknown>)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      out[key] = merge((base as Record<string, unknown>)[key], value as DeepPartial<unknown>);
    } else if (value !== undefined) {
      out[key] = value;
    }
  }
  return out as T;
}

export function getDictionary(language: UiLanguage): Dictionary {
  if (language === "ru") return dictionaries.ru;
  return merge(dictionaries.ru as Dictionary, overlays[language]);
}

export const LANGUAGES: Array<{ code: UiLanguage; label: string; flag: string }> = [
  { code: "ru", label: "Русский", flag: "🇷🇺" },
  { code: "kk", label: "Қазақша", flag: "🇰🇿" },
  { code: "en", label: "English", flag: "🇬🇧" },
];
