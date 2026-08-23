'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

type User = { id: string; role: 'STUDENT' | 'TEACHER'; student?: { id: string } };
type ChatMessage = { role: 'user' | 'assistant'; content: string };
type SessionInfo = { id: string; createdAt: string; messageCount?: number };

const defaultApiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3002/v1';

/**
 * LLMs emit math in many inconsistent styles: \(...\)/\[...\], $...$/$$...$$,
 * bare [ ... ] / ( ... ), or even broken inline $ placement like \sin$-\alpha$.
 * Strategy: line-by-line. If a line contains LaTeX commands and is not
 * mostly Cyrillic prose, wrap the whole line in $$...$$ (display math).
 * Already-wrapped lines ($..$ / $$..$$) are left untouched.
 * Runs on the raw markdown string (regex on text, never on parsed HTML),
 * so it stays XSS-safe.
 */
function normalizeMathDelimiters(markdown: string): string {
  const hasMath = (s: string) =>
    /\\[a-zA-Z]+|\^\{?[0-9a-zA-Z]|\_\{?[0-9a-zA-Z]|\{|\}|sqrt|frac|dfrac/.test(s);
  const hasCyrillic = (s: string) => /[а-яА-ЯёЁ]/.test(s);
  const isWrapped = (s: string) => {
    const t = s.trim();
    return /^\$\$[\s\S]*\$\$$/.test(t) || (/^\$[^$\n]*\$$/.test(t) && !t.includes('$$'));
  };

  // Convert LaTeX delimiters even inside prose lines.
  const converted = markdown
    .replace(/\\\[([\s\S]*?)\\\]/g, (_, inner: string) => `$$${inner}$$`)
    .replace(/\\\(([\s\S]*?)\\\)/g, (_, inner: string) => `$${inner}$`);

  return converted
    .split('\n')
    .map((line) => {
      if (!line.trim() || !hasMath(line) || isWrapped(line) || hasCyrillic(line)) {
        return line;
      }
      const cleaned = line.replace(/\$/g, '').replace(/^\s*\[/, '').replace(/\]\s*$/, '').trim();
      return cleaned ? `$${cleaned}$$` : line;
    })
    .join('\n');
}

export default function ChatPage() {
  const [apiUrl, setApiUrl] = useState(defaultApiUrl);
  const [token, setToken] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState('Войдите и создайте сессию');
  const [streaming, setStreaming] = useState(false);
  const [usage, setUsage] = useState<{ inputTokens: number; outputTokens: number; model: string; provider: string } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  async function request(path: string, options: RequestInit = {}) {
    const response = await fetch(`${apiUrl}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) throw new Error(body?.message ?? `HTTP ${response.status}`);
    return body;
  }

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const data = await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: form.get('email'), password: form.get('password') }),
      });
      setToken(String(data.accessToken));
      const me = await request('/auth/me');
      setUser(me);
      setStatus('Вошли. Создайте сессию или выберите из списка.');
      await loadSessions(String(data.accessToken));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Ошибка входа');
    }
  }

  async function loadSessions(authToken?: string) {
    const bearer = authToken ?? token;
    try {
      const data = await request('/chat/sessions');
      setSessions(data.sessions);
      setStatus('Список сессий загружен');
      void bearer;
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Ошибка загрузки сессий');
    }
  }

  async function createSession() {
    if (!token) return setStatus('Сначала войдите');
    try {
      const data = await request('/chat/sessions', { method: 'POST' });
      setActiveSessionId(data.sessionId);
      setMessages([]);
      setUsage(null);
      await loadSessions();
      setStatus('Сессия создана. Задайте вопрос.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Ошибка создания сессии');
    }
  }

  async function openSession(sessionId: string) {
    if (!token) return;
    try {
      const data = await request(`/chat/sessions/${sessionId}`);
      setActiveSessionId(sessionId);
      setMessages(data.messages.map((m: { role: string; content: string }) => ({ role: m.role, content: m.content })));
      setStatus(`Сессия ${sessionId.slice(-6)}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Ошибка загрузки сессии');
    }
  }

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !activeSessionId || !input.trim() || streaming) return;
    const question = input.trim();
    setInput('');
    setUsage(null);
    const userMessage: ChatMessage = { role: 'user', content: question };
    setMessages((prev) => [...prev, userMessage]);
    setStreaming(true);

    const assistantMessage: ChatMessage = { role: 'assistant', content: '' };
    setMessages((prev) => [...prev, assistantMessage]);
    let currentText = '';

    try {
      const response = await fetch(`${apiUrl}/chat/sessions/${activeSessionId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: question }),
      });

      if (!response.ok || !response.body) {
        const err = await response.json().catch(() => null);
        throw new Error(err?.message ?? `HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n\n');
        buffer = lines.pop() ?? '';

        for (const block of lines) {
          const eventMatch = block.match(/^event: (.+)$/m);
          const dataMatch = block.match(/^data: (.+)$/m);
          if (!eventMatch || !dataMatch) continue;
          const event = eventMatch[1];
          const data = JSON.parse(dataMatch[1]);

          if (event === 'message') {
            currentText += data.text ?? '';
            setMessages((prev) => {
              const next = [...prev];
              next[next.length - 1] = { role: 'assistant', content: currentText };
              return next;
            });
          } else if (event === 'done') {
            setUsage(data.usage);
          } else if (event === 'error') {
            throw new Error(data.message ?? 'Ошибка стрима');
          }
        }
      }

      await loadSessions();
      setStatus('Ответ получен');
    } catch (error) {
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        next[next.length - 1] = { role: 'assistant', content: last.content || (error instanceof Error ? error.message : 'Ошибка') };
        return next;
      });
      setStatus('Ошибка при получении ответа');
    } finally {
      setStreaming(false);
    }
  }

  return (
    <main className="shell">
      <header>
        <p className="eyebrow">Future Minds · AI Tutor</p>
        <h1>Чат с ИИ-репетитором</h1>
        <p>
          Вход → сессия → вопрос. Ответ стримится по SSE. <a href="/">← Тестовый клиент API</a>
        </p>
      </header>

      <section className="panel">
        <h2>1. Вход</h2>
        <form onSubmit={login} className="row">
          <input name="email" defaultValue="demo_student@hackathon.com" type="email" required />
          <input name="password" defaultValue="password123" type="password" required />
          <button>Войти</button>
        </form>
        <p className="muted">
          <span>
            Демо: student / teacher — пароль <code>password123</code>. Модель работает в mock-режиме, пока не задан
            API-ключ (см. README).
          </span>
        </p>
      </section>

      <section className="panel">
        <h2>2. Сессии</h2>
        <div className="row">
          <button onClick={createSession} disabled={!token}>
            + Новая сессия
          </button>
          <button onClick={() => loadSessions()} disabled={!token}>
            Обновить список
          </button>
        </div>
        {sessions.length > 0 && (
          <div className="session-list">
            {sessions.map((session) => (
              <button
                key={session.id}
                className={`session-item ${session.id === activeSessionId ? 'active' : ''}`}
                onClick={() => openSession(session.id)}
              >
                {new Date(session.createdAt).toLocaleString()} · {session.messageCount ?? 0} сообщений
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="panel chat-panel">
        <h2>3. Диалог {activeSessionId ? <code className="small">{activeSessionId.slice(-6)}</code> : null}</h2>
        <div className="chat-window">
          {messages.length === 0 && <p className="muted">Задайте вопрос, например: «Объясни, как решать квадратные уравнения».</p>}
          {messages.map((message, index) => (
            <div key={index} className={`bubble ${message.role}`}>
              {message.role === 'assistant' ? (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, [remarkMath, { singleDollarTextMath: false }]]}
                  rehypePlugins={[[rehypeKatex, { throwOnError: false }]]}
                >
                  {normalizeMathDelimiters(message.content)}
                </ReactMarkdown>
              ) : (
                message.content
              )}
            </div>
          ))}
          {streaming && <div className="bubble assistant typing">…</div>}
          <div ref={bottomRef} />
        </div>
        <form onSubmit={send} className="row">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ваш вопрос…"
            disabled={!activeSessionId || streaming}
          />
          <button disabled={!activeSessionId || streaming || !input.trim()}>Отправить</button>
        </form>
        {usage && (
          <p className="muted">
            <span>
              {usage.provider}/{usage.model} · input {usage.inputTokens} tok · output {usage.outputTokens} tok
            </span>
          </p>
        )}
        <output>{status}</output>
      </section>
    </main>
  );
}
