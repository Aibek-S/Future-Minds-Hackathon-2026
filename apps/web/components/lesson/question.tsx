"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Lightbulb, X } from "lucide-react";
import { ZereAvatar } from "@/components/ai/zere";
import { Button } from "@/components/ui/button";
import { AiChatPanel } from "@/components/ai/chat-panel";

/**
 * TEXT_INPUT-first question renderer.
 * Backend stores only task content (free-text) — no type column exists,
 * so quiz-style interaction arrives exclusively through AI QUIZ widgets.
 */
export function QuestionRenderer({
  content,
  value,
  onChange,
  disabled,
  onSubmit,
  autoFocusKey,
}: {
  content: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  onSubmit: () => void;
  autoFocusKey?: number;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocusKey != null) ref.current?.focus();
  }, [autoFocusKey]);

  return (
    <motion.div key={content} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full">
      <p className="whitespace-pre-wrap text-xl font-bold leading-snug sm:text-2xl">{content}</p>
      <label className="mt-6 block">
        <span className="mb-2 block text-xs font-black uppercase tracking-widest text-text-3">
          Ваш ответ
        </span>
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !disabled) {
              e.preventDefault();
              onSubmit();
            }
          }}
          rows={2}
          disabled={disabled}
          placeholder="Введите ответ…"
          className="w-full resize-none rounded-lg border-b-4 border-border bg-surface px-4 py-3.5 text-lg font-semibold outline-none transition focus:border-primary focus:bg-primary-subtle/30 disabled:opacity-60"
        />
      </label>
    </motion.div>
  );
}

/** Slide-over contextual AI panel used inside lessons. */
export function AskAiPanel({
  open,
  onClose,
  topicName,
  subjectName,
  currentQuestion,
  lastWrongAnswer,
}: {
  open: boolean;
  onClose: () => void;
  topicName: string;
  subjectName?: string;
  currentQuestion?: string;
  lastWrongAnswer?: string | null;
}) {
  const contextPrefix = [
    `Контекст урока: предмет «${subjectName ?? "—"}», тема «${topicName}».`,
    currentQuestion ? `Текущее задание: ${currentQuestion}` : "",
    lastWrongAnswer ? `Ответ ученика, который был неверным: «${lastWrongAnswer}». Объясни ошибку мягко.` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            role="dialog"
            aria-label="Спросить ИИ"
            className="fixed inset-y-0 right-0 z-[65] flex w-full max-w-md flex-col border-l border-border bg-background shadow-pop"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 280, damping: 30 }}
          >
            <header className="flex items-center gap-3 border-b border-border bg-surface px-4 py-3.5">
              <ZereAvatar size={36} mood="thinking" />
              <div className="flex-1">
                <p className="text-sm font-black">ИИ-наставник</p>
                <p className="truncate text-xs text-text-3">{topicName}</p>
              </div>
              <button onClick={onClose} aria-label="Закрыть" className="grid size-9 place-items-center rounded-md text-text-3 hover:bg-surface-2">
                <X className="size-5" />
              </button>
            </header>

            <div className="border-b border-border bg-primary-subtle px-4 py-3">
              <p className="flex items-start gap-2 text-xs leading-relaxed text-primary">
                <Lightbulb className="mt-0.5 size-4 shrink-0" />
                Я знаю тему и твою последнюю ошибку — спрашивай прямо по заданию.
              </p>
            </div>

            <AiChatPanel
              scenario="chat"
              className="min-h-0 flex-1 p-4"
              contextPrefix={contextPrefix}
              autoStartGreeting={false}
              quickPrompts={[
                ...(currentQuestion ? ["Объясни, как решать это задание"] : []),
                ...(lastWrongAnswer ? ["Почему мой ответ неверный?"] : []),
                "Дай формулу",
                "Разбери по шагам",
              ]}
            />

            <footer className="border-t border-border bg-surface p-3">
              <Button variant="secondary" fullWidth onClick={onClose}>
                Вернуться к заданию <ArrowRight className="size-4" />
              </Button>
            </footer>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
