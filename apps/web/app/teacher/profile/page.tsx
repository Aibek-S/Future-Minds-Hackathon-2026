"use client";

import { useQuery } from "@tanstack/react-query";
import { LogOut, Save, Users } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/card";
import { MasteryBar } from "@/components/ui/progress";
import { CardSkeleton, ErrorState } from "@/components/ui/states";
import { classesService } from "@/lib/services/classes";
import { teacherService } from "@/lib/services/teacher";
import { useLogout, useMe } from "@/lib/hooks/use-auth";
import { useLanguage } from "@/lib/stores/language";
import { LANGUAGES } from "@/lib/i18n/dictionaries";
import type { UiLanguage } from "@/lib/types";

export default function TeacherProfilePage() {
  const me = useMe();
  const logout = useLogout();
  const lang = useLanguage((s) => s.ui);
  const setLang = useLanguage((s) => s.setUi);
  const teacherId = me.data?.teacher?.id;

  const classes = useQuery({
    queryKey: ["teacher-classes", teacherId],
    queryFn: () => classesService.list(teacherId!),
    enabled: !!teacherId,
  });

  // Average mastery across all taught classes (real overview data).
  const overviews = useQuery({
    queryKey: ["teacher-overviews", (classes.data ?? []).map((c) => c.id).join(",")],
    queryFn: async () => {
      const ids = (classes.data ?? []).map((c) => c.id);
      return Promise.all(ids.map(async (id) => ({ id, o: await teacherService.overview(id) })));
    },
    enabled: (classes.data ?? []).length > 0,
    staleTime: 60_000,
  });

  if (me.isLoading || classes.isLoading) return <CardSkeleton />;
  if (me.isError) return <ErrorState onRetry={() => window.location.reload()} />;

  const studentsTotal = (classes.data ?? []).reduce((a, c) => a + c.studentCount, 0);
  const ovList = overviews.data ?? [];
  const avgMastery = ovList.length ? ovList.reduce((a, x) => a + x.o.classMastery, 0) / ovList.length : null;
  const needHelp = ovList.reduce((a, x) => a + x.o.studentsNeedingRemediation, 0);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* Identity */}
      <section className="flex flex-col items-center gap-4 rounded-xl border border-border bg-surface p-6 text-center shadow-card sm:flex-row sm:text-left">
        <span className="grid size-20 place-items-center rounded-full bg-gradient-to-br from-primary to-[#6366F1] text-3xl font-black text-white shadow-pop">
          {(me.data?.name ?? "Я").slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-black">{me.data?.name}</h1>
          <p className="truncate text-sm text-text-2">{me.data?.email}</p>
          <div className="mt-2 flex flex-wrap justify-center gap-2 sm:justify-start">
            <Badge tone="primary">Учитель</Badge>
            <Badge tone="neutral">{classes.data?.length ?? 0} кл.</Badge>
            <Badge tone="info">{studentsTotal} учеников</Badge>
            {avgMastery != null && <Badge tone="success">Ср. мастерство {Math.round(avgMastery * 100)}%</Badge>}
            {needHelp > 0 && <Badge tone="error">{needHelp} нуждаются в помощи</Badge>}
          </div>
        </div>
        <Button variant="outline" onClick={logout}>
          <LogOut className="size-4" /> Выйти
        </Button>
      </section>

      {/* Classes */}
      <section>
        <h3 className="mb-3 flex items-center gap-2 text-lg font-black">
          <Users className="size-5 text-primary" /> Мои классы
        </h3>
        <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-card">
          {(classes.data ?? []).map((c) => {
            const ov = ovList.find((x) => x.id === c.id)?.o;
            return (
              <div key={c.id} className="border-b border-border/60 px-5 py-4 last:border-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-bold">{c.name}</p>
                  <span className="font-mono text-xs text-text-3">код: {c.code}</span>
                </div>
                <p className="text-xs text-text-2">{c.studentCount} учеников · {c.grade} класс</p>
                {ov && (
                  <div className="mt-2 max-w-xs">
                    <MasteryBar mastery={ov.classMastery} showLabel />
                  </div>
                )}
              </div>
            );
          })}
          {(classes.data ?? []).length === 0 && (
            <p className="px-5 py-8 text-center text-sm text-text-3">Классов пока нет.</p>
          )}
        </div>
      </section>

      {/* Preferences */}
      <section>
        <h3 className="mb-3 text-lg font-black">Настройки</h3>
        <div className="rounded-xl border border-border bg-surface p-5 shadow-card">
          <p className="mb-2 text-sm font-bold text-text-2">Язык интерфейса</p>
          <div className="flex flex-wrap gap-2">
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                onClick={() => setLang(l.code as UiLanguage)}
                aria-pressed={lang === l.code}
                className={`rounded-full border-2 px-4 py-2 text-sm font-bold transition ${
                  lang === l.code ? "border-primary bg-primary-light text-primary" : "border-border hover:border-primary/40"
                }`}
              >
                {l.flag} {l.label}
              </button>
            ))}
          </div>
          <p className="mt-4 flex items-center gap-2 text-xs text-text-3">
            <Save className="size-3.5" /> Язык сохраняется автоматически
          </p>
        </div>
      </section>
    </div>
  );
}
