"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowRight, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/card";
import { MasteryBar } from "@/components/ui/progress";
import { Modal } from "@/components/ui/modal";
import { CardSkeleton, ErrorState } from "@/components/ui/states";
import { MetricCard } from "@/components/teacher/dashboard";
import { teacherService } from "@/lib/services/teacher";
import { classesService } from "@/lib/services/classes";
import { useMe } from "@/lib/hooks/use-auth";
import { SearchBar } from "@/components/ui/search-bar";

export default function TeacherDashboard() {
  const me = useMe();
  const teacherId = me.data?.teacher?.id;

  const classes = useQuery({
    queryKey: ["teacher-classes", teacherId],
    queryFn: () => classesService.list(teacherId!),
    enabled: !!teacherId,
  });
  const [classId, setClassId] = useState<string | null>(null);
  const active = classId ?? classes.data?.[0]?.id ?? null;

  const overview = useQuery({
    queryKey: ["overview", active],
    queryFn: () => teacherService.overview(active!),
    enabled: !!active,
  });

  const [createOpen, setCreateOpen] = useState(false);

  if (!teacherId || classes.isLoading) return <CardSkeleton />;
  if (classes.isError) return <ErrorState onRetry={() => void classes.refetch()} />;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-text-2">Добрый день, {me.data?.name}!</p>
          <h1 className="text-3xl font-black">Ваши классы</h1>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <SearchBar className="w-64" placeholder="Поиск по материалам..." />
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" /> Создать класс
          </Button>
        </div>
      </div>

      {(classes.data ?? []).length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface p-12 text-center">
          <p className="text-lg font-black">Пока нет классов</p>
          <p className="mt-1 text-sm text-text-2">Создайте класс и поделитесь кодом с учениками.</p>
          <Button className="mt-5" size="lg" onClick={() => setCreateOpen(true)}>
            Создать первый класс
          </Button>
        </div>
      ) : (
        <>
          {/* Class chips */}
          <div className="flex flex-wrap gap-2">
            {(classes.data ?? []).map((c) => (
              <button
                key={c.id}
                onClick={() => setClassId(c.id)}
                className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                  active === c.id
                    ? "bg-text text-white shadow-card"
                    : "border border-border bg-surface text-text-2 hover:border-primary/40"
                }`}
              >
                {c.name} · {c.studentCount} уч.
              </button>
            ))}
          </div>

          {/* KPIs */}
          {overview.isLoading ? (
            <CardSkeleton />
          ) : overview.data ? (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <MetricCard value={classes.data?.find((c) => c.id === active)?.studentCount ?? 0} label="Учеников" />
                <MetricCard
                  value={`${Math.round(overview.data.classMastery * 100)}%`}
                  label="Среднее мастерство"
                  accent="#10B981"
                />
                <MetricCard
                  value={overview.data.studentsNeedingRemediation}
                  label="Нужна помощь"
                  accent="#EF4444"
                />
              </div>

              {/* Weak / Strong topics */}
              <div className="grid gap-6 lg:grid-cols-2">
                <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-border bg-surface p-5 shadow-card">
                  <h3 className="mb-4 text-lg font-black">Слабые темы</h3>
                  <TopicBars topics={overview.data.weakTopics} color="#EF4444" />
                </motion.section>
                <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="rounded-xl border border-border bg-surface p-5 shadow-card">
                  <h3 className="mb-4 text-lg font-black">Сильные темы</h3>
                  <TopicBars topics={overview.data.strongTopics} color="#10B981" />
                </motion.section>
              </div>

              <Link href={`/teacher/classes/${active}`}>
                <Button size="lg">
                  Открыть класс <ArrowRight className="size-4" />
                </Button>
              </Link>
            </>
          ) : null}
        </>
      )}

      <CreateClassModal open={createOpen} onClose={() => setCreateOpen(false)} teacherId={teacherId ?? ""} />
    </div>
  );
}

function TopicBars({ topics, color }: { topics?: Array<{ topicId: string; topicName: string; mastery: number }>; color: string }) {
  if (!topics?.length) return <p className="text-sm text-text-3">Нет данных.</p>;
  return (
    <div className="space-y-4">
      {topics.slice(0, 5).map((t) => (
        <div key={t.topicId}>
          <div className="mb-1 flex items-center justify-between gap-2 text-sm">
            <span className="truncate font-semibold">{t.topicName}</span>
            <span className="shrink-0 font-extrabold" style={{ color }}>
              {Math.round(t.mastery * 100)}%
            </span>
          </div>
          <MasteryBar mastery={t.mastery} color={color} showLabel={false} size="sm" />
        </div>
      ))}
    </div>
  );
}

function CreateClassModal({ open, onClose, teacherId }: { open: boolean; onClose: () => void; teacherId: string }) {
  const qc = useQueryClientSafe();
  const [name, setName] = useState("");
  const [grade, setGrade] = useState(9);
  const [created, setCreated] = useState<{ code: string } | null>(null);

  async function create() {
    const c = await classesService.create(teacherId, { name, grade });
    setCreated({ code: c.code });
    void qc.invalidateQueries({ queryKey: ["teacher-classes", teacherId] });
  }

  return (
    <Modal open={open} onClose={onClose} title="Новый класс">
      {created ? (
        <div className="text-center">
          <Badge tone="success">Создан</Badge>
          <p className="mt-3 text-sm text-text-2">Код для входа учеников:</p>
          <p className="mt-2 select-all rounded-lg bg-primary-subtle py-3 text-2xl font-black tracking-widest text-primary">
            {created.code}
          </p>
          <Button className="mt-5" fullWidth onClick={onClose}>
            Готово
          </Button>
        </div>
      ) : (
        <>
          <label className="block">
            <span className="mb-1 block text-[13px] font-semibold text-text-2">Название</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="10А"
              className="h-11 w-full rounded-md border-2 border-border px-3 outline-none focus:border-primary"
            />
          </label>
          <label className="mt-3 block">
            <span className="mb-1 block text-[13px] font-semibold text-text-2">Класс (7–12)</span>
            <input
              type="number"
              min={7}
              max={12}
              value={grade}
              onChange={(e) => setGrade(Number(e.target.value))}
              className="h-11 w-full rounded-md border-2 border-border px-3 outline-none focus:border-primary"
            />
          </label>
          <Button className="mt-5" fullWidth size="lg" disabled={!name.trim()} loading={false} onClick={() => void create()}>
            Создать
          </Button>
        </>
      )}
    </Modal>
  );
}

// tiny helper to avoid importing useQueryClient twice in file scope
import { useQueryClient } from "@tanstack/react-query";
function useQueryClientSafe() {
  return useQueryClient();
}
