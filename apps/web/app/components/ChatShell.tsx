'use client';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { WidgetExamples, WidgetRenderer } from './widgets';

type User = { id: string; role: 'STUDENT' | 'TEACHER' | 'ADMIN'; student?: { id: string } };
export type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  widget?: unknown;
  widgets?: unknown[];
};
type SessionInfo = { id: string; createdAt: string; messageCount?: number };
type ChatKind = 'chat' | 'diagnostic' | 'feedback' | 'orchestrator';

export interface ChatShellProps {
  kind: ChatKind;
  apiBase: string; // e.g. '/chat'
  title: string;
  subtitle: string;
  requireRole?: 'STUDENT' | 'TEACHER';
  placeholder?: string;
  demoEmail?: string;
  extraField?: { label: string; name: string; placeholder?: string };
  showExamples?: boolean;
}

const defaultApiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3002/v1';

export function ChatShell({
  kind,
  apiBase,
  title,
  subtitle,
  requireRole,
  placeholder = 'Ваш вопрос…',
  demoEmail = 'demo_student@hackathon.com',
  extraField,
  showExamples,
}: ChatShellProps) {
  const [apiUrl, setApiUrl] = useState(defaultApiUrl);
  const [token, setToken] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [extra, setExtra] = useState('');
  const [status, setStatus] = useState('Войдите и создайте сессию');
  const [streaming, setStreaming] = useState(false);
  const [usage, setUsage] = useState<{ inputTokens: number; outputTokens: number; model: string; provider: string } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, streaming]);

  const request = useCallback(
    async (path: string, options: RequestInit = {}) => {
      const response = await fetch(`${apiUrl}${path}`, {
        ...options,
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.message ?? `HTTP ${response.status}`);
      return body;
    },
    [apiUrl, token],
  );

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
      if (requireRole && me.role !== requireRole && me.role !== 'ADMIN') {
        setStatus(`Этот раздел доступен только для роли ${requireRole}.`);
        return;
      }
      setStatus('Вошли. Создайте сессию или выберите из списка.');
      await loadSessions(String(data.accessToken));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Ошибка входа');
    }
  }

  async function loadSessions(authToken?: string) {
    try {
      const data = await request(`/${apiBase}/sessions`);
      setSessions(data.sessions);
      setStatus('Список сессий загружен');
      void authToken;
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Ошибка загрузки сессий');
    }
  }

  async function createSession() {
    if (!token) return setStatus('Сначала войдите');
    try {
      const data = await request(`/${apiBase}/sessions`, { method: 'POST' });
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
      const data = await request(`/${apiBase}/sessions/${sessionId}`);
      setActiveSessionId(sessionId);
      setMessages(
        data.messages.map((m: { role: string; content: string; widget?: unknown }) => ({
          role: m.role,
          content: m.content,
          widget: m.widget ?? undefined,
        })),
      );
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
    setMessages((prev) => [...prev, { role: 'user', content: question }]);
    setStreaming(true);

    let currentText = '';
    const widgetAccumulator: { widget: unknown; index: number }[] = [];

    try {
      const body: Record<string, unknown> = { content: question };
      if (extraField && extra.trim()) {
        body[extraField.name] = extra.trim();
      }
      const response = await fetch(`${apiUrl}/${apiBase}/sessions/${activeSessionId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });

      if (!response.ok || !response.body) {
        const err = await response.json().catch(() => null);
        throw new Error(err?.message ?? `HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let widgetIndex = 0;

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
          } else if (event === 'widget') {
            widgetAccumulator.push({ widget: data.widget, index: widgetIndex++ });
            setMessages((prev) => {
              const next = [...prev];
              next[next.length - 1] = {
                role: 'assistant',
                content: currentText,
                widgets: widgetAccumulator.map((w) => w.widget),
              };
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
        next[next.length - 1] = {
          role: 'assistant',
          content: last.content || (error instanceof Error ? error.message : 'Ошибка'),
        };
        return next;
      });
      setStatus('Ошибка при получении ответа');
    } finally {
      setStreaming(false);
    }
  }

  const roleMismatch = requireRole && user && user.role !== requireRole && user.role !== 'ADMIN';

  return (
    <main className="shell">
      <header>
        <p className="eyebrow">Future Minds · AI Tutor</p>
        <h1>{title}</h1>
        <p>
          {subtitle}{' '}
          <a href={kind === 'chat' ? '/' : '/chat'}>← {kind === 'chat' ? 'Тестовый клиент API' : 'Чат'}</a>
        </p>
      </header>

      <section className="panel">
        <h2>1. Вход</h2>
        <form onSubmit={login} className="row">
          <input name="email" defaultValue={demoEmail} type="email" required />
          <input name="password" defaultValue="password123" type="password" required />
          <button>Войти</button>
        </form>
        <p className="muted">
          <span>
            Демо: {demoEmail} — пароль <code>password123</code>. Требуется роль: {requireRole ?? 'любая'}.
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
        {roleMismatch && (
          <p className="muted">
            <span>Войдите под аккаунтом с ролью {requireRole} (например, {demoEmail}).</span>
          </p>
        )}
        <div className="chat-window">
          {messages.length === 0 && (
            <p className="muted">Задайте вопрос{extraField ? ` и укажите ${extraField.label}` : ''}.</p>
          )}
          {messages.map((message, index) => (
            <MessageRow key={index} message={message} />
          ))}
          {streaming && <div className="bubble assistant typing">…</div>}
          <div ref={bottomRef} />
        </div>
        <form onSubmit={send} className="row">
          {extraField && (
            <input
              value={extra}
              onChange={(e) => setExtra(e.target.value)}
              placeholder={extraField.placeholder ?? extraField.label}
              disabled={!activeSessionId || streaming}
            />
          )}
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={placeholder}
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

      {showExamples && (
        <section className="panel">
          <h2>Примеры виджетов</h2>
          <p className="muted">Модель может вставить эти виджеты в ответ — они появятся в диалоге.</p>
          <WidgetExamples />
        </section>
      )}
    </main>
  );
}

function MessageRow({ message }: { message: ChatMessage }) {
  const [revealedWidgets, setRevealedWidgets] = useState(0);
  const widgets = (message.widgets as { type?: string; payload?: Record<string, unknown> }[] | undefined) ??
    (message.widget ? [message.widget as { type?: string; payload?: Record<string, unknown> }] : []);
  const answeredWidgets = Math.max(revealedWidgets, 1);
  const visibleWidgets = widgets.slice(0, answeredWidgets);

  return (
    <div className={`bubble ${message.role}`}>
      {message.role === 'assistant' ? (
        <>
          <ReactMarkdown
            remarkPlugins={[remarkGfm, [remarkMath, { singleDollarTextMath: false }]]}
            rehypePlugins={[[rehypeKatex, { throwOnError: false }]]}
          >
            {normalizeMathDelimiters(message.content)}
          </ReactMarkdown>
          {visibleWidgets.map((widget, i) => (
            <div key={i} className="widget-wrap">
              <WidgetRenderer type={String(widget.type ?? '')} payload={widget.payload ?? {}} />
              {widgets.length > 1 && (
                <div className="widget-progress">
                  Виджет {i + 1} из {widgets.length}
                  <button
                    className="widget-skip"
                    onClick={() => setRevealedWidgets((r) => Math.min(r + 1, widgets.length))}
                    disabled={i + 1 >= widgets.length}
                  >
                    Пропустить
                  </button>
                </div>
              )}
            </div>
          ))}
        </>
      ) : (
        message.content
      )}
    </div>
  );
}

function normalizeMathDelimiters(markdown: string): string {
  const hasMath = (s: string) =>
    /\\[a-zA-Z]+|\^\{?[0-9a-zA-Z]|\_\{?[0-9a-zA-Z]|\{|\}|sqrt|frac|dfrac/.test(s);
  const hasCyrillic = (s: string) => /[а-яА-ЯёЁ]/.test(s);
  const isWrapped = (s: string) => {
    const t = s.trim();
    return /^\$\$[\s\S]*\$\$$/.test(t) || (/^\$[^$\n]*\$$/.test(t) && !t.includes('$$'));
  };
  const converted = markdown
    .replace(/\\\[([\s\S]*?)\\\]/g, (_, inner: string) => `$$${inner}$$`)
    .replace(/\\\(([\s\S]*?)\\\)/g, (_, inner: string) => `$${inner}$`);
  return converted
    .split('\n')
    .map((line) => {
      if (!line.trim() || !hasMath(line) || isWrapped(line) || hasCyrillic(line)) return line;
      const cleaned = line.replace(/\$/g, '').replace(/^\s*\[/, '').replace(/\]\s*$/, '').trim();
      return cleaned ? `$${cleaned}$$` : line;
    })
    .join('\n');
}
