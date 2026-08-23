'use client';

import { FormEvent, useState } from 'react';

type User = { id: string; role: 'STUDENT' | 'TEACHER'; student?: { id: string } };
const defaultApiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3002/v1';

export default function HomePage() {
  const [apiUrl, setApiUrl] = useState(defaultApiUrl);
  const [token, setToken] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState('Готов к работе');
  const [result, setResult] = useState<unknown>(null);
  const [subjectId, setSubjectId] = useState('');
  const [taskId, setTaskId] = useState('');
  const [answer, setAnswer] = useState('правильно');

  async function request(path: string, options: RequestInit = {}) {
    const response = await fetch(`${apiUrl}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) throw new Error(body?.message ?? `HTTP ${response.status}`);
    return body;
  }

  async function run(action: () => Promise<unknown>, success: string) {
    try {
      const data = await action();
      setResult(data);
      setStatus(success);
      return data;
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Ошибка запроса');
      return null;
    }
  }

  async function checkApi(event: FormEvent) {
    event.preventDefault();
    try {
      const response = await fetch(`${apiUrl}/auth/me`);
      setStatus(response.status === 401 ? 'API доступен: требуется авторизация' : `API ответил: ${response.status}`);
    } catch { setStatus('Не удалось подключиться к API'); }
  }

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const data = await run(() => request('/auth/login', { method: 'POST', body: JSON.stringify({ email: form.get('email'), password: form.get('password') }) }), 'Логин успешен. Загрузите профиль.');
    if (data && typeof data === 'object' && 'accessToken' in data) setToken(String(data.accessToken));
  }

  async function register(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const data = await run(() => request('/auth/register', { method: 'POST', body: JSON.stringify({ name: form.get('name'), email: form.get('email'), password: form.get('password'), grade: Number(form.get('grade')), role: 'STUDENT' }) }), 'Ученик зарегистрирован. Загрузите профиль.');
    if (data && typeof data === 'object' && 'accessToken' in data) setToken(String(data.accessToken));
  }

  async function loadMe() {
    const data = await run(() => request('/auth/me'), 'Профиль загружен');
    if (data && typeof data === 'object') setUser(data as User);
  }

  function studentRequest(path: 'knowledge' | 'roadmap') {
    if (!user?.student) return setStatus('Сначала войдите как ученик');
    const query = subjectId ? `?subjectId=${encodeURIComponent(subjectId)}` : '';
    void run(() => request(`/students/${user.student!.id}/${path}${query}`), `${path} загружен`);
  }

  function diagnostic() {
    if (!user?.student || !subjectId) return setStatus('Введите topic ID в поле ниже');
    void run(() => request(`/students/${user.student!.id}/diagnostic`, { method: 'POST', body: JSON.stringify({ answers: [{ topicId: subjectId, answer: 'demo', correct: true, attemptNumber: 1 }] }) }), 'Diagnostic выполнен');
  }

  function attempt() {
    if (!user?.student || !taskId) return setStatus('Нужны Student profile и task ID');
    void run(() => request(`/tasks/${taskId}/attempts`, { method: 'POST', body: JSON.stringify({ studentId: user.student!.id, answer }) }), 'Попытка сохранена');
  }

  function teacherOnly() {
    if (user?.role !== 'TEACHER') {
      setStatus('Войдите под demo_teacher@hackathon.com, затем загрузите профиль');
      return false;
    }
    return true;
  }

  function listTopics() {
    if (!teacherOnly() || !subjectId) return;
    void run(() => request(`/topics?subjectId=${encodeURIComponent(subjectId)}`), 'Темы загружены');
  }

  function createTopic(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!teacherOnly() || !subjectId) return;
    const form = new FormData(event.currentTarget);
    const prerequisites = String(form.get('prerequisites') ?? '').split(',').map((id) => id.trim()).filter(Boolean);
    void run(() => request('/topics', { method: 'POST', body: JSON.stringify({ name: form.get('name'), subjectId, prerequisites }) }), 'Тема создана');
  }

  function createTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!teacherOnly()) return;
    const form = new FormData(event.currentTarget);
    const topicId = String(form.get('topicId'));
    void run(() => request(`/topics/${topicId}/tasks`, { method: 'POST', body: JSON.stringify({ difficulty: form.get('difficulty'), content: form.get('content'), source: 'manual' }) }), 'Задача создана');
  }

  return <main className="shell">
    <header><p className="eyebrow">Future Minds · MVP</p><h1>Тестовый клиент API</h1><p>Серый функциональный интерфейс для Student API. <a href="/chat">→ Чат с ИИ-репетитором</a></p></header>
    <section className="panel"><h2>1. API и авторизация</h2>
      <form onSubmit={checkApi} className="row"><input aria-label="Base URL" value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} /><button>Проверить API</button></form>
      <div className="forms"><form onSubmit={login}><h3>Войти</h3><input name="email" defaultValue="demo_student@hackathon.com" type="email" required /><input name="password" defaultValue="password123" type="password" required /><button>Логин</button></form>
      <form onSubmit={register}><h3>Создать ученика</h3><input name="name" placeholder="Имя" required /><input name="email" placeholder="Email" type="email" required /><input name="password" placeholder="Пароль от 8 символов" type="password" minLength={8} required /><input name="grade" defaultValue="9" type="number" min="7" max="12" required /><button>Регистрация</button></form></div>
      <button onClick={loadMe} disabled={!token}>Загрузить мой профиль</button><output>{status}</output></section>
    <section className="panel"><h2>2. Knowledge, roadmap, diagnostic</h2><p>Subject ID фильтрует knowledge/roadmap. Для диагностики введите topic ID.</p><div className="row"><input value={subjectId} onChange={(e) => setSubjectId(e.target.value)} placeholder="Subject ID / topic ID" /><button onClick={() => studentRequest('knowledge')}>Knowledge</button><button onClick={() => studentRequest('roadmap')}>Roadmap</button><button onClick={diagnostic}>Diagnostic</button></div></section>
    <section className="panel"><h2>3. Попытка решения</h2><p>Временный mock принимает <code>правильно</code> или <code>correct</code>.</p><div className="row"><input value={taskId} onChange={(e) => setTaskId(e.target.value)} placeholder="Task ID" /><input value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Ответ" /><button onClick={attempt}>Отправить</button></div></section>
    <section className="panel"><h2>4. Учитель: темы и задачи</h2><p>Войди с <code>demo_teacher@hackathon.com</code>, пароль <code>password123</code>, затем используй Subject ID выше.</p><div className="row"><button onClick={listTopics}>Загрузить темы предмета</button></div><div className="forms"><form onSubmit={createTopic}><h3>Создать тему</h3><input name="name" placeholder="Название темы" required /><input name="prerequisites" placeholder="Prerequisite IDs через запятую" /><button>Создать тему</button></form><form onSubmit={createTask}><h3>Создать задачу</h3><input name="topicId" placeholder="Topic ID" required /><select name="difficulty" defaultValue="easy"><option value="easy">easy</option><option value="medium">medium</option><option value="hard">hard</option></select><textarea name="content" placeholder="Текст задания" minLength={3} required /><button>Создать задачу</button></form></div></section>
    <section className="panel result"><h2>Ответ API</h2><pre>{result ? JSON.stringify(result, null, 2) : 'Здесь появится ответ API.'}</pre></section>
  </main>;
}
