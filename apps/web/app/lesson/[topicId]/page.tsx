"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Brain, Lightbulb, X } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/states";
import { QuestionRenderer, AskAiPanel } from "@/components/lesson/question";
import { AnswerFeedback, MistakeFeedback, LessonFinish, difficultyLabel, unlockedLabels } from "@/components/lesson/feedback";
import { studentsService } from "@/lib/services/students";
import { tasksService } from "@/lib/services/tasks";
import { topicsService } from "@/lib/services/topics";
import { useMe } from "@/lib/hooks/use-auth";
import { useAttemptedTasks, isFresh } from "@/lib/stores/attempted-tasks";
import type { AttemptResult, Difficulty } from "@/lib/types";
import { RequireAuth } from "@/components/system/require-auth";

type Phase = "question" | "correct" | "wrong" | "finish";

/** Fisher–Yates: randomized combinations of tasks per spec §33. */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function LessonPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const params = useParams<{ topicId: string }>();
  const topicId = params.topicId;

  // Data
  const me = useMe();
  const studentId = me.data?.student?.id;
  const topicQuery = useQuery({ queryKey: ["topic", topicId], queryFn: () => topicsService.list().then((l) => l.find((t) => t.id === topicId) ?? null) });
  const knowledge = useQuery({
    queryKey: ["knowledge-topic", studentId],
    queryFn: () => studentsService.knowledge(studentId!),
    enabled: !!studentId,
  });
  const kThis = useMemo(() => knowledge.data?.find((k) => k.topicId === topicId), [knowledge.data, topicId]);
  const masteryStart = kThis?.mastery ?? 0;

  // Task queue: start easy; adaptive difficulty follows backend nextTaskDifficulty.
  const [queue, setQueue] = useState<Array<{ id: string; difficulty: Difficulty; content: string }>>([]);
  const [loadedDiff, setLoadedDiff] = useState<Difficulty | null>(null);
  const attempted = useAttemptedTasks((s) => s.items);
  const markAttempted = useAttemptedTasks((s) => s.markAttempted);

  /** Fresh (never-attempted) tasks first — they reward mastery ×1.0. */
  function prioritize<T extends { id: string }>(tasks: T[]): T[] {
    return [...tasks].sort((a, b) => Number(isFresh(attempted, b.id)) - Number(isFresh(attempted, a.id)));
  }

  const initialTasks = useQuery({
    queryKey: ["tasks", topicId, "easy"],
    queryFn: () => topicsService.tasks(topicId, "easy"),
  });

  if (initialTasks.data && loadedDiff === null && queue.length === 0) {
    setQueue(prioritize(shuffle(initialTasks.data)));
    setLoadedDiff("easy");
  }

  async function refill(difficulty: Difficulty) {
    const more = await topicsService.tasks(topicId, difficulty);
    const fresh = more.filter((m) => !queue.some((e) => e.id === m.id));
    setQueue((q) => [...q, ...prioritize(shuffle(fresh))]);
    setLoadedDiff(difficulty);
  }

  // Runtime
  const [phase, setPhase] = useState<Phase>("question");
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [askAi, setAskAi] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const [lastWrong, setLastWrong] = useState<string | null>(null);
  const [stats, setStats] = useState({ correct: 0, answered: 0 });
  const [unlockedNames, setUnlockedNames] = useState<string[]>([]);

  const current = queue[index];
  const totalPlanned = Math.max(queue.length, 5);
  const progressValue = Math.min(index / Math.max(totalPlanned, 1), 1);

  async function check() {
    if (!current || !studentId || !answer.trim()) return;
    setChecking(true);
    try {
      const res = await tasksService.attempt(current.id, studentId, answer.trim());
      setResult(res);
      markAttempted(current.id);
      setStats((s) => ({ correct: s.correct + (res.correct ? 1 : 0), answered: s.answered + 1 }));
      if (res.correct) {
        setPhase("correct");
        setUnlockedNames(unlockedLabels(res.prerequisiteUnlocked));
        // Adaptive difficulty → prefetch next level
        const d = res.nextTaskDifficulty;
        if (d !== loadedDiff && index + 2 >= queue.length) void refill(d);
      } else {
        setLastWrong(answer.trim());
        setPhase("wrong");
      }
      // Invalidate mastery data
      void qc.invalidateQueries({ queryKey: ["knowledge", studentId] });
      void knowledge.refetch();
    } catch {
      alert("Не удалось отправить ответ. Проверьте подключение.");
    } finally {
      setChecking(false);
    }
  }

  async function next() {
    setPhase("question");
    setAnswer("");
    setResult(null);
    const nextIndex = index + 1;

    // Finish after 5 answers or when queue exhausted
    if (nextIndex >= Math.min(queue.length, 5)) {
      if (nextIndex < queue.length && stats.answered < 5) {
        setIndex(nextIndex);
        return;
      }
      setPhase("finish");
      return;
    }
    // Ensure there is a task at the new position (refill by adaptive difficulty)
    if (!queue[nextIndex] && result) {
      await refill(result.nextTaskDifficulty);
    }
    setIndex(nextIndex);
  }

  /* ---------- Render ---------- */

  if (initialTasks.isLoading || !studentId) {
    return (
      <CenterShell>
        <div className="space-y-4">
          <Skeleton className="h-3 w-40 bg-white/20" />
          <Skeleton className="h-10 w-full bg-white/20" />
          <Skeleton className="h-24 w-full bg-white/20" />
          <Skeleton className="h-12 w-full bg-white/20" />
        </div>
      </CenterShell>
    );
  }

  if (!topicQuery.isLoading && !topicQuery.data) {
    return (
      <CenterShell>
        <p className="text-lg font-bold">Тема не найдена.</p>
        <Link href="/home" className="mt-4">
          <Button variant="secondary">К карте знаний</Button>
        </Link>
      </CenterShell>
    );
  }

  if (phase === "finish") {
    return (
      <CenterShell>
        <LessonFinish
          topicName={topicQuery.data?.name ?? "Тема"}
          masteryStart={masteryStart}
          masteryEnd={kThis?.mastery ?? masteryStart}
          correctCount={stats.correct}
          total={Math.max(stats.answered, 1)}
          studentId={studentId}
          topicId={topicId}
          onDone={() => router.push("/home")}
        />
      </CenterShell>
    );
  }

  if (!current && phase === "question") {
    return (
      <CenterShell>
        <p className="text-xl font-black">Для этой темы пока нет заданий</p>
        <p className="mt-2 text-text-2">Попросите учителя добавить задачи — или потренируйтесь в другой теме.</p>
        <Link href="/home" className="mt-6">
          <Button size="lg">К карте знаний</Button>
        </Link>
      </CenterShell>
    );
  }

  return (
    <div className="flex h-dvh flex-col bg-background">
      {/* Immersive top bar */}
      <header className="flex items-center gap-4 px-4 py-4 sm:px-8">
        <button
          onClick={() => setExitOpen(true)}
          aria-label="Выйти из урока"
          className="grid size-10 shrink-0 place-items-center rounded-md text-text-3 transition hover:bg-surface hover:text-error"
        >
          <X className="size-6" />
        </button>

        {/* Progress */}
        <div className="min-w-0 flex-1">
          <ProgressBar value={progressValue} height={14} barClassName="" />
        </div>

        {/* Live mastery */}
        <div className="flex shrink-0 items-center gap-2 rounded-full bg-primary-light px-3.5 py-2 font-extrabold text-primary">
          <Brain className="size-5" aria-hidden />
          <motion.span key={kThis?.mastery} initial={{ scale: 1.15 }} animate={{ scale: 1 }}>
            {kThis ? `${Math.round(kThis.mastery * 100)}%` : "—"}
          </motion.span>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto flex w-full max-w-2xl min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-40 pt-4 sm:px-8">
        {current && (
          <>
            <p className="mb-4 text-xs font-black uppercase tracking-[0.25em] text-text-3">
              {topicQuery.data?.name} · {difficultyLabel(current.difficulty)}
            </p>
            <AnimatePresence mode="wait">
              {phase === "question" && (
                <motion.div key={`q-${current.id}-${index}`} exit={{ opacity: 0, y: -16 }}>
                  <QuestionRenderer
                    content={current.content}
                    value={answer}
                    onChange={setAnswer}
                    disabled={checking}
                    onSubmit={() => void check()}
                    autoFocusKey={index}
                  />
                </motion.div>
              )}
              {phase === "correct" && result && (
                <AnswerFeedback key="ok" result={result} unlockedNames={unlockedNames} onContinue={() => void next()} />
              )}
              {phase === "wrong" && result && (
                <MistakeFeedback
                  key="err"
                  result={result}
                  onTryAgain={() => {
                    setPhase("question");
                    setAnswer("");
                    setResult(null);
                  }}
                  onExplainMore={() => setAskAi(true)}
                />
              )}
            </AnimatePresence>
          </>
        )}
      </main>

      {/* Bottom action bar */}
      {phase === "question" && (
        <footer className="fixed inset-x-0 bottom-0 border-t-2 border-border bg-surface px-4 py-4 sm:px-8">
          <div className="mx-auto flex max-w-2xl items-center gap-3">
            <Button variant="ghost" size="lg" onClick={() => setAskAi(true)} className="shrink-0">
              <Lightbulb className="size-5 text-warning" /> ИИ
            </Button>
            <Button size="xl" fullWidth loading={checking} disabled={!answer.trim()} onClick={() => void check()}>
              Проверить ответ
            </Button>
          </div>
        </footer>
      )}

      {/* Contextual Ask AI */}
      <AskAiPanel
        open={askAi}
        onClose={() => setAskAi(false)}
        topicName={topicQuery.data?.name ?? ""}
        currentQuestion={current?.content}
        lastWrongAnswer={lastWrong}
      />

      {/* Exit confirm */}
      <Modal open={exitOpen} onClose={() => setExitOpen(false)} title="Выйти из урока?">
        <p className="text-sm text-text-2">Прогресс по отвеченным заданиям уже сохранён — мастерство обновлено.</p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Button variant="outline" size="lg" onClick={() => setExitOpen(false)}>
            Остаться
          </Button>
          <Button variant="danger" size="lg" onClick={() => router.push("/home")}>
            Выйти
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function CenterShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-background p-6">
      <div className="w-full max-w-xl">{children}</div>
    </div>
  );
}

export default function Page() {
  return (
    <RequireAuth>
      <LessonPage />
    </RequireAuth>
  );
}
