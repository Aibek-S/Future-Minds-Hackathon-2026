"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Send, Sparkles, User } from "lucide-react";
import { ZereAvatar } from "./zere";
import { tutorService } from "@/lib/services/tutor";
import type { AiScenario, AiWidget } from "@/lib/types";
import { AiMarkdown, StreamingDots } from "./markdown";
import { WidgetRenderer } from "./widgets";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  widgets: AiWidget[];
  streaming?: boolean;
}

let msgId = 0;
const nextId = () => `m${++msgId}`;

/**
 * Contextual SSE chat panel for any scenario (/chat, /diagnostic, ...).
 * Streaming text appears progressively; widgets render in strict order.
 */
export function AiChatPanel({
  scenario,
  greeting,
  quickPrompts = [],
  contextPrefix,
  className,
  autoStartGreeting = true,
  onAssistantDone,
  assistantAvatar,
}: {
  scenario: AiScenario;
  greeting?: string;
  /** One-tap prompts shown above the composer (e.g., current topic names). */
  quickPrompts?: string[];
  /** Hidden context prepended to each user message so the AI stays on-topic. */
  contextPrefix?: string;
  className?: string;
  autoStartGreeting?: boolean;
  onAssistantDone?: () => void;
  /** Custom assistant avatar (defaults to Zere mascot). */
  assistantAvatar?: React.ReactNode;
}) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    if (!autoStartGreeting) return;
    tutorService
      .createSession(scenario)
      .then((s) => !cancelled && setSessionId(s.sessionId))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [scenario, autoStartGreeting]);

  useEffect(() => {
    if (greeting && messages.length === 0 && sessionId) {
      pushAssistant(greeting);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [greeting, sessionId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  function pushUser(text: string) {
    setMessages((m) => [...m, { id: nextId(), role: "user", text, widgets: [] }]);
  }

  function pushAssistant(text: string) {
    setMessages((m) => [...m, { id: nextId(), role: "assistant", text, widgets: [] }]);
  }

  async function send(raw?: string) {
    const content = (raw ?? input).trim();
    if (!content || busy) return;
    setInput("");
    pushUser(content);

    if (!sessionId) {
      try {
        const s = await tutorService.createSession(scenario);
        setSessionId(s.sessionId);
        await stream(s.sessionId, content);
      } catch {
        pushAssistant("Не удалось связаться с ИИ. Проверьте подключение и попробуйте ещё раз.");
      }
      return;
    }
    await stream(sessionId, content);
  }

  async function stream(sid: string, content: string) {
    setBusy(true);
    const id = nextId();
    setMessages((m) => [
      ...m,
      { id, role: "assistant", text: "", widgets: [], streaming: true },
    ]);

    const appendText = (chunk: string) =>
      setMessages((m) => m.map((msg) => (msg.id === id ? { ...msg, text: msg.text + chunk } : msg)));
    const addWidget = (w: AiWidget) =>
      setMessages((m) => m.map((msg) => (msg.id === id ? { ...msg, widgets: [...msg.widgets, w] } : msg)));

    await tutorService.send(
      scenario,
      sid,
      { content: contextPrefix ? `${contextPrefix}\n\n${content}` : content },
      {
        onText: appendText,
        onWidget: addWidget,
        onError: () =>
          setMessages((m) =>
            m.map((msg) =>
              msg.id === id && !msg.text
                ? { ...msg, text: "ИИ не ответил. Попробуйте переформулировать вопрос." }
                : msg,
            ),
          ),
      },
    );

    setMessages((m) => m.map((msg) => (msg.id === id ? { ...msg, streaming: false } : msg)));
    setBusy(false);
    onAssistantDone?.();
  }

  return (
    <div className={`flex min-h-0 flex-col ${className ?? ""}`}>
      {/* Messages */}
      <div ref={scrollRef} className="scroll-thin flex-1 space-y-4 overflow-y-auto px-1 py-2">
        <AnimatePresence initial={false}>
          {messages.map((m) => (
            <motion.div
              key={m.id}
              layout="position"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18 }}
              className={`flex gap-2.5 ${m.role === "user" ? "flex-row-reverse" : ""}`}
            >
              <span
                className={`grid size-8 shrink-0 place-items-center overflow-hidden rounded-full ${
                  m.role === "assistant" ? "bg-primary-subtle ring-2 ring-primary-light" : "bg-surface-2 text-text-2"
                }`}
              >
                {m.role === "assistant" ? (
                  (assistantAvatar ?? <ZereAvatar size={30} mood={m.streaming ? "thinking" : "happy"} />)
                ) : (
                  <User className="size-4" />
                )}
              </span>
              <div className={`max-w-[85%] space-y-2 ${m.role === "user" ? "text-right" : ""}`}>
                <div
                  className={`inline-block rounded-lg px-4 py-2.5 text-left ${
                    m.role === "user"
                      ? "bg-primary text-white"
                      : "border border-border bg-surface shadow-card"
                  }`}
                >
                  {m.role === "user" ? (
                    <p className="whitespace-pre-wrap">{m.text}</p>
                  ) : m.text ? (
                    <AiMarkdown text={m.text} />
                  ) : m.streaming ? (
                    <StreamingDots />
                  ) : null}
                </div>
                {m.widgets.map((w, i) => (
                  <div key={i} onClickCapture={(e) => e.stopPropagation()}>
                    <WidgetRenderer widget={w} />
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Quick prompts */}
      {quickPrompts.length > 0 && (
        <div className="flex flex-wrap gap-2 px-1 pb-2">
          {quickPrompts.map((q) => (
            <button
              key={q}
              onClick={() => void send(q)}
              disabled={busy}
              className="rounded-full border border-primary/30 bg-primary-subtle px-3 py-1.5 text-xs font-bold text-primary transition hover:bg-primary-light disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
        className="flex items-end gap-2 border-t border-border pt-3"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          rows={1}
          placeholder="Спросите что угодно…"
          aria-label="Сообщение ИИ"
          className="max-h-32 min-h-11 flex-1 resize-none rounded-md border-2 border-border bg-surface px-4 py-2.5 text-sm outline-none transition focus:border-primary"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          aria-label="Отправить"
          className="grid size-11 shrink-0 place-items-center rounded-md bg-primary text-white shadow-[0_4px_14px_rgba(124,58,237,0.35)] transition hover:bg-primary-hover disabled:opacity-40"
        >
          <Send className="size-4" />
        </button>
      </form>
    </div>
  );
}

export function AiBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary-light px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-primary">
      <Sparkles className="size-3" /> AI
    </span>
  );
}
