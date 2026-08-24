"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowRight, Flame, Map, Sparkles, Target } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MasteryBar } from "@/components/ui/progress";
import { CardSkeleton, EmptyState } from "@/components/ui/states";
import { studentsService } from "@/lib/services/students";
import { topicsService } from "@/lib/services/topics";
import { useMe } from "@/lib/hooks/use-auth";
import { useGamification } from "@/lib/stores/gamification";
import { subjectTheme } from "@/lib/subjects";

export default function HomePage() {
  const me = useMe();
  const studentId = me.data?.student?.id;
  const streak = useGamification((s) => s.streak);

  // Keep daily streak fresh (placeholder gamification)
  const bump = useGamification((s) => s.bumpDailyStreak);
  bump();

  const subjects = useQuery({
    queryKey: ["subjects", studentId],
    queryFn: () => studentsService.subjects(studentId!),
    enabled: !!studentId,
  });

  // Current topic across the first subject with a roadmap current
  const roadmaps = useQuery({
    queryKey: ["roadmap-all", studentId],
    queryFn: async () => {
      const list = (await studentsService.subjects(studentId!)) ?? [];
      const out = await Promise.all(
        list.map(async (s) => ({ subject: s, roadmap: await studentsService.roadmap(studentId!, s.id) })),
      );
      return out;
    },
    enabled: !!studentId,
  });

  const firstCurrent = (roadmaps.data ?? []).find((r) => r.roadmap.current);
  const overall =
    subjects.data && subjects.data.length > 0
      ? subjects.data.reduce((a, s) => a + s.avgMastery, 0) / subjects.data.length
      : null;

  if (!studentId || subjects.isLoading || roadmaps.isLoading) {
    return (
      <div className="grid gap-4">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-black">Привет, {me.data?.name?.split(" ")[0]}!</h1>
        <p className="mt-1 text-text-2">ZERTTE знает твой уровень. Продолжим?</p>
      </motion.div>

      {/* Stats chips */}
      <div className="flex flex-wrap gap-2">
        <Chip icon={<Flame className="size-4 text-[#EA580C]" />} label={`${streak} дн. подряд`} />
        <Chip icon={<Target className="size-4 text-primary" />} label={`Мастерство ${overall != null ? Math.round(overall * 100) : 0}%`} />
        <Chip icon={<Map className="size-4 text-info" />} label={`${subjects.data?.length ?? 0} предмета`} />
      </div>

      {/* Continue card */}
      {firstCurrent ? (
        <motion.section
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative overflow-hidden rounded-xl p-6 text-white shadow-pop sm:p-8"
          style={{ background: "linear-gradient(135deg,#7C3AED 0%,#6366F1 100%)" }}
        >
          <div className="pointer-events-none absolute -right-8 -top-8 size-40 rounded-full bg-white/10" aria-hidden />
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-white/80">
            <Sparkles className="size-4" /> Твоя следующая тема
          </p>
          <h2 className="mt-2 max-w-md text-2xl font-black sm:text-3xl">{firstCurrent.roadmap.current!.topicName}</h2>
          <p className="mt-2 max-w-lg text-sm text-white/85">{firstCurrent.roadmap.current!.reason}</p>
          <Link href={`/lesson/${firstCurrent.roadmap.current!.topicId}`}>
            <Button variant="secondary" size="xl" className="mt-5">
              Начать урок <ArrowRight className="size-5" />
            </Button>
          </Link>
        </motion.section>
      ) : (
        <EmptyState
          emoji="🚀"
          title="Начните свой путь"
          body="Пройдите диагностику — ZERTTE подберёт первую тему."
          action={
            <Link href="/diagnostic">
              <Button size="lg">Пройти диагностику</Button>
            </Link>
          }
        />
      )}

      {/* Subjects quick list */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-black">Предметы</h3>
          <Link href="/learn" className="text-sm font-bold text-primary hover:underline">
            Все →
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {(subjects.data ?? []).slice(0, 4).map((s, i) => {
            const t = subjectTheme(s.id, i);
            return (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-lg border border-border bg-surface p-4 shadow-card"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="grid size-11 place-items-center rounded-lg text-base font-black text-white"
                    style={{ background: t.gradient }}
                  >
                    {s.name.slice(0, 1)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-bold">{s.name}</p>
                    <p className="text-xs text-text-2">
                      {s.topicsCompleted} / {s.topicCount} тем пройдено
                    </p>
                  </div>
                </div>
                <div className="mt-3">
                  <MasteryBar mastery={s.avgMastery} color={t.accent} />
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Chip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-sm font-bold shadow-card">
      {icon}
      {label}
    </span>
  );
}

// Avoid unused import warning for topics service in tree-shaken dev builds.
void topicsService;
