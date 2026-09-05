"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, Check, ListOrdered, Sigma, HelpCircle, X, AlertTriangle } from "lucide-react";
import type { AiWidget } from "@/lib/types";
import { AiMarkdown } from "./markdown";
import { Button } from "@/components/ui/button";
import { teacherService } from "@/lib/services/teacher";

/** Reusable renderers for strict JSON widget contract. Broken widgets are dropped by backend. */

export function WidgetRenderer({ widget, onQuizAnswer }: { widget: AiWidget; onQuizAnswer?: (correct: boolean) => void }) {
  if (!widget || typeof widget !== "object" || !("type" in widget)) return null;
  switch (widget.type) {
    case "QUIZ":
      return <AIQuizCard payload={widget.payload as never} onAnswered={onQuizAnswer} />;
    case "FORMULA_CARD":
      return <FormulaCard payload={widget.payload as never} />;
    case "STEP_BY_STEP":
      return <StepByStepCard payload={widget.payload as never} />;
    case "MATH_EXPRESSION":
      return <MathExpression payload={widget.payload as never} />;
    case "CONFIRM":
      return <ConfirmPreview payload={widget.payload as never} />;
    default:
      return null;
  }
}

export function AIQuizCard({
  payload,
  onAnswered,
}: {
  payload: { question: string; options: string[]; correctIndex: number; explanation?: string };
  onAnswered?: (correct: boolean) => void;
}) {
  const [picked, setPicked] = useState<number | null>(null);
  const done = picked !== null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border-2 border-primary/25 bg-primary-subtle p-4"
    >
      <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-primary">
        <HelpCircle className="size-4" /> Quiz
      </div>
      <p className="font-semibold">{payload.question}</p>
      <div className="mt-3 space-y-2">
        {(payload.options ?? []).map((opt, i) => {
          const isCorrect = i === payload.correctIndex;
          const state = !done ? "idle" : isCorrect ? "correct" : i === picked ? "wrong" : "dim";
          return (
            <button
              key={i}
              disabled={done}
              onClick={() => {
                setPicked(i);
                onAnswered?.(isCorrect);
              }}
              className={`flex w-full items-center gap-2 rounded-md border-2 px-3 py-2.5 text-left text-sm font-medium transition ${
                state === "idle"
                  ? "border-border bg-surface hover:border-primary/50"
                  : state === "correct"
                    ? "border-success bg-[#ECFDF5] text-[#047857]"
                    : state === "wrong"
                      ? "border-error bg-[#FEF2F2] text-error"
                      : "border-border opacity-50"
              }`}
            >
              <span className="grid size-6 shrink-0 place-items-center rounded-full border-2 border-current text-xs font-black">
                {String.fromCharCode(65 + i)}
              </span>
              {opt}
            </button>
          );
        })}
      </div>
      {done && payload.explanation && (
        <div className="mt-3 rounded-md bg-surface p-3">
          <AiMarkdown text={payload.explanation} />
        </div>
      )}
    </motion.div>
  );
}

export function FormulaCard({ payload }: { payload: { title: string; formula: string; note?: string } }) {
  return (
    <div className="rounded-lg border-2 border-info/30 bg-[#F0F9FF] p-4">
      <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-info">
        <Sigma className="size-4" /> Формула
      </div>
      <p className="text-base font-bold">{payload.title}</p>
      <div className="mt-2 rounded-md bg-white px-3 py-2.5 text-center text-lg font-semibold text-text">
        <AiMarkdown text={`\`${payload.formula}\``} />
      </div>
      {payload.note && <p className="mt-2 text-sm text-text-2">{payload.note}</p>}
    </div>
  );
}

export function StepByStepCard({ payload }: { payload: { problem: string; steps: Array<{ title: string; content: string }> } }) {
  const [open, setOpen] = useState(0);
  return (
    <div className="rounded-lg border-2 border-warning/30 bg-[#FFFBEB] p-4">
      <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[#B45309]">
        <ListOrdered className="size-4" /> Пошагово
      </div>
      <p className="font-semibold">{payload.problem}</p>
      <ol className="mt-3 space-y-2">
        {(payload.steps ?? []).map((s, i) => (
          <li key={i}>
            <button
              onClick={() => setOpen(open === i ? -1 : i)}
              className="flex w-full items-center gap-2 rounded-md bg-white px-3 py-2 text-left text-sm font-semibold transition hover:brightness-[0.99]"
              aria-expanded={open === i}
            >
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-[#B45309] text-[10px] font-black text-white">
                {i + 1}
              </span>
              {s.title}
            </button>
            {open === i && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                className="overflow-hidden px-3 pt-2 text-sm text-text-2"
              >
                <AiMarkdown text={s.content} />
              </motion.div>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

export function MathExpression({ payload }: { payload: { prompt: string; expected: string; explanation?: string } }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <div className="rounded-lg border-2 border-primary/25 bg-primary-subtle p-4">
      <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-primary">
        <BookOpen className="size-4" /> Задача
      </div>
      <AiMarkdown text={payload.prompt} />
      {!revealed ? (
        <Button size="sm" variant="secondary" className="mt-3" onClick={() => setRevealed(true)}>
          Показать ответ
        </Button>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3">
          <p className="rounded-md bg-surface px-3 py-2 font-mono text-sm">{payload.expected}</p>
          {payload.explanation && (
            <div className="mt-2 text-sm text-text-2">
              <AiMarkdown text={payload.explanation} />
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

type ConfirmStatus = "idle" | "pending" | "approved" | "rejected" | "error";

export function ConfirmPreview({
  payload,
}: {
  payload: { title: string; text: string; resourceType?: string; resource?: { recommendationId?: string } };
}) {
  const recommendationId = payload.resourceType === "LESSON_PLAN" ? payload.resource?.recommendationId : undefined;
  const [status, setStatus] = useState<ConfirmStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  async function respond(action: "approve" | "reject") {
    if (!recommendationId || status === "pending") return;
    setStatus("pending");
    setError(null);
    try {
      if (action === "approve") {
        await teacherService.approve(recommendationId);
        setStatus("approved");
      } else {
        await teacherService.reject(recommendationId);
        setStatus("rejected");
      }
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Не удалось выполнить действие.");
    }
  }

  return (
    <div className="rounded-lg border-2 border-primary/40 bg-surface p-4 shadow-card">
      <div className="flex items-center gap-2">
        <Check className="size-4 text-primary" />
        <p className="font-bold">{payload.title}</p>
      </div>
      <div className="mt-2 text-sm text-text-2">
        <AiMarkdown text={payload.text} />
      </div>

      {recommendationId && status === "idle" && (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant="success" onClick={() => void respond("approve")}>
            <Check className="mr-1.5 size-4" /> Принять план
          </Button>
          <Button size="sm" variant="outline" onClick={() => void respond("reject")}>
            <X className="mr-1.5 size-4" /> Отклонить
          </Button>
        </div>
      )}
      {recommendationId && status === "pending" && (
        <p className="mt-3 text-xs font-semibold text-text-3">Сохраняю…</p>
      )}
      {status === "approved" && (
        <p className="mt-3 flex items-center gap-1.5 text-sm font-bold text-success">
          <Check className="size-4" /> План принят — урок добавлен в календарь класса.
        </p>
      )}
      {status === "rejected" && (
        <p className="mt-3 flex items-center gap-1.5 text-sm font-bold text-text-3">
          <X className="size-4" /> Отклонено.
        </p>
      )}
      {status === "error" && (
        <p className="mt-3 flex items-center gap-1.5 text-sm font-bold text-error">
          <AlertTriangle className="size-4" /> {error}
        </p>
      )}
    </div>
  );
}
