"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CardSkeleton, EmptyState, ErrorState } from "@/components/ui/states";
import { RoadmapPanel } from "@/components/knowledge-tree/roadmap-panel";
import { SubjectCard } from "@/components/student/subject-card";
import { studentsService } from "@/lib/services/students";
import { useMe } from "@/lib/hooks/use-auth";
import { useGamification } from "@/lib/stores/gamification";
import { subjectTheme } from "@/lib/subjects";

export default function HomePage() {
  const me = useMe();
  const studentId = me.data?.student?.id;
  const streak = useGamification((s) => s.streak);
  const bump = useGamification((s) => s.bumpDailyStreak);
  bump();

  const subjects = useQuery({
    queryKey: ["subjects", studentId],
    queryFn: () => studentsService.subjects(studentId!),
    enabled: !!studentId,
  });
  const [openId, setOpenId] = useState<string | null>(null);

  if (!studentId || subjects.isLoading) return <CardSkeleton />;
  if (subjects.isError)
    return <ErrorState title="Не удалось загрузить главную" onRetry={() => void subjects.refetch()} />;

  const list = subjects.data ?? [];
  const overall = list.length ? list.reduce((a, s) => a + s.avgMastery, 0) / list.length : null;

  return (
    <div className="space-y-5">
      {/* Greeting row */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-center gap-x-4 gap-y-2"
      >
        <h1 className="text-2xl font-black sm:text-3xl">Привет, {me.data?.name?.split(" ")[0]}!</h1>
        <div className="flex flex-wrap gap-2">
          <Chip dot="#EA580C" label={`${streak} дн. подряд`} />
          <Chip dot="#7C3AED" label={`Мастерство ${overall != null ? Math.round(overall * 100) : 0}%`} />
        </div>
      </motion.div>

      {/* Main two-column layout: knowledge tree (left) + subject cards (right) */}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_400px]">
        {/* LEFT — Knowledge Tree */}
        <motion.section
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          aria-label="Карта знаний"
        >
          {list.length === 0 ? (
            <EmptyState
              emoji="🗺"
              title="Пока нет предметов"
              body="Пройдите диагностику — и здесь появится ваша карта знаний."
              action={
                <Link href="/diagnostic">
                  <Button>Пройти диагностику</Button>
                </Link>
              }
            />
          ) : (
            <RoadmapPanel />
          )}
        </motion.section>

        {/* RIGHT — Subject cards (expandable, same as Learn page) */}
        <motion.aside
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.06 }}
          className="space-y-3"
          aria-label="Ваши предметы"
        >
          <h2 className="px-1 text-sm font-black uppercase tracking-[0.2em] text-text-3">Предметы</h2>
          {list.map((s, i) => {
            const t = subjectTheme(s.id, i);
            return (
              <SubjectCard
                key={s.id}
                subject={s}
                accent={t.accent}
                gradient={t.gradient}
                index={i}
                expanded={openId === s.id}
                onToggle={() => setOpenId(openId === s.id ? null : s.id)}
              />
            );
          })}
          {list.length > 0 && (
            <Link href="/learn" className="block px-1 pt-1 text-right text-xs font-bold text-primary hover:underline">
              Все предметы на странице «Учиться» →
            </Link>
          )}
        </motion.aside>
      </div>
    </div>
  );
}

function Chip({ dot, label }: { dot: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-bold shadow-card sm:text-sm">
      <span className="size-2 rounded-full" style={{ background: dot }} aria-hidden />
      {label}
    </span>
  );
}
