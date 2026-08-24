"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MasteryBar, ProgressBar } from "@/components/ui/progress";
import { CardSkeleton, EmptyState, ErrorState } from "@/components/ui/states";
import { studentsService } from "@/lib/services/students";
import { topicsService } from "@/lib/services/topics";
import { useMe } from "@/lib/hooks/use-auth";
import { subjectTheme } from "@/lib/subjects";

export default function LearnPage() {
  const me = useMe();
  const studentId = me.data?.student?.id;
  const subjects = useQuery({
    queryKey: ["subjects", studentId],
    queryFn: () => studentsService.subjects(studentId!),
    enabled: !!studentId,
  });
  const [openId, setOpenId] = useState<string | null>(null);

  if (subjects.isError)
    return <ErrorState title="Не удалось загрузить предметы" onRetry={() => void subjects.refetch()} />;
  if (!studentId || subjects.isLoading) return <CardSkeleton />;
  if ((subjects.data ?? []).length === 0)
    return (
      <EmptyState
        emoji="📚"
        title="Пока нет предметов"
        body="Давайте подберём для вас правильный путь обучения."
        action={
          <Link href="/diagnostic">
            <Button>Начать диагностику</Button>
          </Link>
        }
      />
    );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black">Ваши предметы</h1>
        <p className="mt-1 text-text-2">Выберите предмет — у каждого своя карта знаний.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {(subjects.data ?? []).map((s, i) => {
          const t = subjectTheme(s.id, i);
          return (
            <SubjectCard
              key={s.id}
              subject={{ id: s.id, name: s.name, avgMastery: s.avgMastery, topicCount: s.topicCount, topicsCompleted: s.topicsCompleted }}
              accent={t.accent}
              gradient={t.gradient}
              index={i}
              expanded={openId === s.id}
              onToggle={() => setOpenId(openId === s.id ? null : s.id)}
            />
          );
        })}
      </div>
    </div>
  );
}

function SubjectCard({
  subject,
  accent,
  gradient,
  index,
  expanded,
  onToggle,
}: {
  subject: { id: string; name: string; avgMastery: number; topicCount: number; topicsCompleted: number };
  accent: string;
  gradient: string;
  index: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const topics = useQuery({
    queryKey: ["topics", subject.id],
    queryFn: () => topicsService.list(subject.id),
    enabled: expanded,
  });

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className={`overflow-hidden rounded-xl border-2 bg-surface shadow-card transition-colors ${expanded ? "" : "hover:border-primary/30"}`}
      style={{ borderColor: expanded ? accent : undefined }}
    >
      <button onClick={onToggle} className="w-full p-5 text-left" aria-expanded={expanded}>
        <div className="flex items-center gap-4">
          <span
            className="grid size-14 shrink-0 place-items-center rounded-xl text-xl font-black text-white shadow-card"
            style={{ background: gradient }}
            aria-hidden
          >
            {subject.name.slice(0, 1)}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-lg font-black">{subject.name}</h3>
            <div className="mt-2 max-w-[220px]">
              <MasteryBar mastery={subject.avgMastery} color={accent} showLabel />
            </div>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="font-semibold text-text-2">
            {subject.topicsCompleted} / {subject.topicCount} тем
          </span>
          <span className="flex items-center gap-1 font-bold" style={{ color: accent }}>
            Продолжить <ArrowRight className="size-4" />
          </span>
        </div>
        <ProgressBar value={subject.topicCount ? subject.topicsCompleted / subject.topicCount : 0} height={6} className="mt-3" barClassName="" />
        <style>{`.bar-${subject.id}{background:${accent}}`}</style>
      </button>

      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          className="border-t border-border bg-background px-5 py-4"
        >
          {topics.isLoading && <p className="text-sm text-text-3">Загружаем темы…</p>}
          <ul className="space-y-1.5">
            {(topics.data ?? []).slice(0, 8).map((tp) => (
              <li key={tp.id}>
                <Link
                  href={`/lesson/${tp.id}`}
                  className="flex items-center justify-between rounded-md px-3 py-2 text-sm font-semibold transition hover:bg-surface hover:shadow-card"
                >
                  <span className="truncate">{tp.name}</span>
                  <ArrowRight className="size-4 shrink-0 text-text-3" />
                </Link>
              </li>
            ))}
          </ul>
        </motion.div>
      )}
    </motion.div>
  );
}
