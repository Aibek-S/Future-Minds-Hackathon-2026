"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { TrendingDown, TrendingUp } from "lucide-react";
import { useState } from "react";
import { MasteryBar } from "@/components/ui/progress";
import { CardSkeleton, EmptyState } from "@/components/ui/states";
import { studentsService } from "@/lib/services/students";
import { useMe } from "@/lib/hooks/use-auth";
import { masteryColor, subjectTheme } from "@/lib/subjects";

export default function ProgressPage() {
  const me = useMe();
  const studentId = me.data?.student?.id;

  const subjects = useQuery({
    queryKey: ["subjects", studentId],
    queryFn: () => studentsService.subjects(studentId!),
    enabled: !!studentId,
  });
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const active = subjectId ?? subjects.data?.[0]?.id ?? null;

  const knowledge = useQuery({
    queryKey: ["knowledge", studentId, active],
    queryFn: () => studentsService.knowledge(studentId!, active ?? undefined),
    enabled: !!studentId && !!active,
  });

  if (!studentId || subjects.isLoading) return <CardSkeleton />;
  if ((subjects.data ?? []).length === 0)
    return <EmptyState emoji="📊" title="Пока нет данных" body="Начните первую тему — и здесь появится ваша статистика." />;

  const overall =
    (subjects.data ?? []).reduce((a, s) => a + s.avgMastery, 0) / Math.max((subjects.data ?? []).length, 1);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black">Прогресс</h1>
        <p className="mt-1 text-text-2">Мастерство обновляется после каждого ответа.</p>
      </div>

      {/* Overall */}
      <motion.section
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-xl p-6 text-white shadow-pop sm:p-8"
        style={{ background: "linear-gradient(135deg,#7C3AED 0%,#6366F1 100%)" }}
      >
        <p className="text-xs font-black uppercase tracking-[0.25em] text-white/75">Общее мастерство</p>
        <div className="mt-2 flex items-end gap-3">
          <span className="text-6xl font-black leading-none">{Math.round(overall * 100)}%</span>
          <span className="pb-1 text-sm text-white/80">
            {(subjects.data ?? []).reduce((a, s) => a + s.topicsCompleted, 0)} тем пройдено
          </span>
        </div>
      </motion.section>

      {/* By subject */}
      <section>
        <h3 className="mb-3 text-lg font-black">По предметам</h3>
        <div className="space-y-4 rounded-xl border border-border bg-surface p-5 shadow-card">
          {(subjects.data ?? []).map((s, i) => {
            const t = subjectTheme(s.id, i);
            return (
              <button key={s.id} onClick={() => setSubjectId(s.id)} className="block w-full text-left" aria-pressed={active === s.id}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className={`font-bold ${active === s.id ? "" : "text-text-2"}`}>{s.name}</span>
                  <span className="font-extrabold" style={{ color: t.accent }}>
                    {Math.round(s.avgMastery * 100)}%
                  </span>
                </div>
                <MasteryBar mastery={s.avgMastery} color={t.accent} showLabel={false} />
              </button>
            );
          })}
        </div>
      </section>

      {/* By topic with trends */}
      <section>
        <h3 className="mb-3 text-lg font-black">По темам{subjects.data?.find((s) => s.id === active) ? ` · ${subjects.data.find((s) => s.id === active)!.name}` : ""}</h3>
        {knowledge.isLoading ? (
          <CardSkeleton />
        ) : (
          <div className="grid gap-x-6 gap-y-4 rounded-xl border border-border bg-surface p-5 shadow-card sm:grid-cols-2">
            {(knowledge.data ?? []).map((k) => (
              <div key={k.topicId}>
                <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                  <span className="truncate font-bold">{k.topicName}</span>
                  <span className="flex shrink-0 items-center gap-1.5 font-extrabold" style={{ color: masteryColor(k.mastery) }}>
                    {k.trend === "improving" && <TrendingUp className="size-4 text-success" />}
                    {k.trend === "declining" && <TrendingDown className="size-4 text-error" />}
                    {Math.round(k.mastery * 100)}%
                  </span>
                </div>
                <MasteryBar mastery={k.mastery} color={masteryColor(k.mastery)} showLabel={false} size="sm" />
                <p className="mt-1 text-[11px] text-text-3">
                  {k.correctAttempts} верных из {k.attempts} попыток
                </p>
              </div>
            ))}
            {(knowledge.data ?? []).length === 0 && (
              <p className="text-sm text-text-3">По этому предмету данных пока нет.</p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
