"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Sparkles, XCircle, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { MasteryBar } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/states";
import { AiChatPanel } from "@/components/ai/chat-panel";
import { studentsService } from "@/lib/services/students";
import { topicsService } from "@/lib/services/topics";
import type { DiagnosticAnswer } from "@/lib/types";
import { useMe } from "@/lib/hooks/use-auth";

type Mode = "ai" | "quick";

export default function DiagnosticPage() {
  const router = useRouter();
  const me = useMe();
  const [mode, setMode] = useState<Mode | null>(null);
  const [result, setResult] = useState<Awaited<ReturnType<typeof studentsService.submitDiagnostic>> | null>(null);

  if (!me.data) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <Skeleton className="h-64 w-full max-w-xl rounded-lg" />
      </div>
    );
  }

  // Result screen
  if (result) {
    return <DiagnosticResultScreen result={result} onStart={() => router.push("/home")} />;
  }

  if (!mode) {
    return (
      <div className="grid min-h-dvh place-items-center bg-gradient-to-b from-primary-subtle to-background p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-lg text-center"
        >
          <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-primary text-white shadow-pop">
            <Sparkles className="size-8" />
          </span>
          <h1 className="mt-6 text-3xl font-black">Давайте поймём, что вы уже знаете</h1>
          <p className="mt-3 text-text-2">
            ИИ задаст несколько вопросов по одной теме за раз. Это займёт ~5 минут и построит вашу карту знаний.
          </p>
          <div className="mt-8 space-y-3">
            <Button size="xl" fullWidth onClick={() => setMode("ai")}>
              Диагностика с ИИ
            </Button>
            <Button variant="outline" size="lg" fullWidth onClick={() => setMode("quick")}>
              Быстрый тест (без ИИ)
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col bg-background">
      {/* Immersive top bar */}
      <header className="flex items-center gap-3 border-b border-border bg-surface px-4 py-3">
        <button onClick={() => setMode(null)} className="text-sm font-semibold text-text-3 hover:text-text">
          ← Назад
        </button>
        <p className="mx-auto text-sm font-bold uppercase tracking-widest text-primary">Диагностика</p>
        <div className="w-10" />
      </header>

      <div className="min-h-0 flex-1">
        <div className="mx-auto h-full max-w-2xl px-4 py-4">
          {mode === "ai" ? (
            <AiChatPanel
              scenario="diagnostic"
              greeting="Привет! Я проведу короткую диагностику. Я буду спрашивать по одному вопросу за раз — отвечай как знаешь. Готов? Скажи «поехали»."
              contextPrefix={`Ученик: ${me.data.name}, класс ${me.data.student?.grade ?? "?"}. Диагностика уровня знаний.`}
              className="h-full"
            />
          ) : (
            <QuickDiagnostic
              studentId={me.data.student!.id}
              onDone={(r) => setResult(r)}
            />
          )}
        </div>
      </div>

      {mode === "ai" && (
        <footer className="border-t border-border bg-surface px-4 py-3 text-center">
          <Button
            size="md"
            variant="secondary"
            onClick={async () => {
              // Chat mode: build profile from current knowledge state.
              const knowledge = await studentsService.knowledge(me.data!.student!.id);
              const recommended =
                knowledge.slice().sort((a, b) => a.mastery - b.mastery)[0]?.topicName ?? "";
              setResult({
                knowledgeState: knowledge.map((k) => ({
                  topicId: k.topicId,
                  topicName: k.topicName,
                  mastery: k.mastery,
                  prerequisiteMet: k.prerequisiteMet,
                })),
                detectedGoals: [],
                recommendedStartTopic: recommended,
              });
            }}
          >
            Завершить и показать профиль
          </Button>
        </footer>
      )}
    </div>
  );
}

/* ---------------- Quick mode: real tasks → POST /diagnostic ---------------- */

function QuickDiagnostic({ studentId, onDone }: { studentId: string; onDone: (r: Awaited<ReturnType<typeof studentsService.submitDiagnostic>>) => void }) {
  const subjects = useQuery({
    queryKey: ["diag-subjects", studentId],
    queryFn: () => studentsService.subjects(studentId),
  });
  const subject = subjects.data?.[0];

  const topics = useQuery({
    queryKey: ["diag-topics", subject?.id],
    queryFn: () => topicsService.list(subject!.id),
    enabled: !!subject,
  });

  // First 4 root-ish topics for the quiz.
  const quizTopics = useMemo(() => (topics.data ?? []).slice(0, 4), [topics.data]);

  const tasksQueries = useQuery({
    queryKey: ["diag-tasks", quizTopics.map((t) => t.id).join(",")],
    queryFn: async () => {
      const all = await Promise.all(
        quizTopics.map(async (t) => ({ topic: t, tasks: await topicsService.tasks(t.id, "easy") })),
      );
      return all.filter((g) => g.tasks.length > 0);
    },
    enabled: quizTopics.length > 0,
  });

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<DiagnosticAnswer[]>([]);

  const submit = useMutation({
    mutationFn: () => studentsService.submitDiagnostic(studentId, answers),
    onSuccess: onDone,
  });

  if (subjects.isLoading || tasksQueries.isLoading) {
    return (
      <div className="space-y-3 pt-10">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  const groups = tasksQueries.data ?? [];
  const flat = groups.flatMap((g) => g.tasks.map((task) => ({ topic: g.topic, task })));
  const current = flat[index];
  const total = flat.length;

  function record(correct: boolean) {
    if (!current) return;
    const next = [
      ...answers,
      { topicId: current.topic.id, answer: "", correct, attemptNumber: 1 },
    ];
    setAnswers(next);
    if (index + 1 >= total) {
      void studentsService.submitDiagnostic(studentId, next).then(onDone);
    }
    setIndex((i) => i + 1);
  }

  if (!current) {
    return (
      <div className="pt-16 text-center">
        <p className="font-bold">Недостаточно задач для диагностики.</p>
        <p className="mt-1 text-sm text-text-2">Попросите учителя добавить задания или начните обучение.</p>
        <Button className="mt-6" onClick={() => onDone({ knowledgeState: [], detectedGoals: [], recommendedStartTopic: "" })}>
          Продолжить
        </Button>
      </div>
    );
  }

  return (
    <div className="pt-6">
      <p className="text-xs font-bold uppercase tracking-widest text-text-3">
        Вопрос {index + 1} / {total} · {current.topic.name}
      </p>
      <motion.div
        key={current.task.id}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-3 rounded-xl border border-border bg-surface p-6 shadow-card"
      >
        <p className="whitespace-pre-wrap text-lg font-semibold">{current.task.content}</p>
      </motion.div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Button size="xl" variant="outline" onClick={() => record(false)}>
          Не знаю
        </Button>
        <Button size="xl" variant="success" onClick={() => record(true)}>
          Знаю ✓
        </Button>
      </div>
      {submit.isPending && <p className="mt-4 text-center text-sm text-text-3">Анализируем ответы…</p>}
    </div>
  );
}

/* ---------------- Result ---------------- */

function DiagnosticResultScreen({
  result,
  onStart,
}: {
  result: Awaited<ReturnType<typeof studentsService.submitDiagnostic>>;
  onStart: () => void;
}) {
  const state = result.knowledgeState ?? [];
  const recommendedName = result.recommendedStartTopic;
  return (
    <div className="min-h-dvh bg-gradient-to-b from-background to-primary-subtle/60 px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-xl"
      >
        <p className="text-center text-sm font-bold uppercase tracking-[0.2em] text-primary">
          Ваш профиль знаний
        </p>
        <h1 className="mt-2 text-center text-3xl font-black">Что мы выяснили</h1>

        <div className="mt-8 space-y-4 rounded-xl border border-border bg-surface p-6 shadow-card">
          {state.length === 0 && (
            <p className="text-center text-sm text-text-2">
              Данных пока мало — начните первую тему, и карта знаний заполнится.
            </p>
          )}
          {state.map((k, i) => (
            <motion.div
              key={k.topicId}
              initial={{ opacity: 0, x: -14 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <div className="mb-1 flex items-center justify-between">
                <p className="flex items-center gap-2 text-sm font-bold">
                  {k.prerequisiteMet ? (
                    <CheckCircle2 className="size-4 text-success" />
                  ) : (
                    <XCircle className="size-4 text-warning" />
                  )}
                  {k.topicName}
                </p>
                {recommendedName === k.topicName && (
                  <span className="rounded-full bg-primary-light px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wide text-primary">
                    Старт
                  </span>
                )}
              </div>
              <MasteryBar mastery={k.mastery} color={k.topicName === recommendedName ? "#7C3AED" : undefined} size="sm" />
            </motion.div>
          ))}
        </div>

        {recommendedName && (
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="mt-6 flex items-center justify-between gap-3 rounded-xl bg-primary p-5 text-white shadow-pop"
          >
            <div>
              <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-white/80">
                <Zap className="size-4" /> Рекомендуемая точка старта
              </p>
              <p className="mt-1 text-xl font-black">{recommendedName}</p>
            </div>
            <Button variant="secondary" size="lg" onClick={onStart}>
              Начать обучение <ArrowRight className="size-4" />
            </Button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
