"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowRight, Target } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MasteryBar } from "@/components/ui/progress";
import { Badge } from "@/components/ui/card";
import { CardSkeleton, EmptyState } from "@/components/ui/states";
import { studentsService } from "@/lib/services/students";
import { useMe } from "@/lib/hooks/use-auth";
import { masteryColor } from "@/lib/subjects";

export default function PracticePage() {
  const me = useMe();
  const studentId = me.data?.student?.id;

  const knowledge = useQuery({
    queryKey: ["knowledge", studentId],
    queryFn: () => studentsService.knowledge(studentId!),
    enabled: !!studentId,
  });

  if (!studentId || knowledge.isLoading) return <CardSkeleton />;

  const topics = (knowledge.data ?? []).slice().sort((a, b) => a.mastery - b.mastery);
  const weak = topics.filter((t) => t.mastery < 0.7).slice(0, 6);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-black">
          <Target className="size-7 text-primary" /> Практика
        </h1>
        <p className="mt-1 text-text-2">Отработайте темы со слабым мастерством — они первыми в списке.</p>
      </div>

      {topics.length === 0 ? (
        <EmptyState emoji="🎯" title="Нет данных для практики" body="Сначала пройдите первую тему — здесь появятся ваши слабые места." />
      ) : (
        <>
          <section>
            <p className="mb-3 text-xs font-black uppercase tracking-[0.25em] text-text-3">Слабые темы</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {(weak.length ? weak : topics.slice(0, 4)).map((t, i) => {
                const color = masteryColor(t.mastery);
                return (
                  <motion.div
                    key={t.topicId}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="rounded-lg border border-border bg-surface p-4 shadow-card"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate font-bold">{t.topicName}</p>
                      <Badge tone={t.trend === "improving" ? "success" : t.trend === "declining" ? "error" : "neutral"}>
                        {t.trend === "improving" ? "растёт" : t.trend === "declining" ? "снижается" : "стабильно"}
                      </Badge>
                    </div>
                    <div className="mt-3">
                      <MasteryBar mastery={t.mastery} color={color} />
                    </div>
                    <Link href={`/lesson/${t.topicId}`} className="mt-3 block">
                      <Button variant="outline" size="md" fullWidth>
                        Практиковать <ArrowRight className="size-4" />
                      </Button>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </section>

          <section>
            <p className="mb-3 text-xs font-black uppercase tracking-[0.25em] text-text-3">Все темы</p>
            <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface shadow-card">
              {topics.map((t) => (
                <li key={t.topicId}>
                  <Link
                    href={`/lesson/${t.topicId}`}
                    className="flex items-center justify-between gap-3 px-4 py-3 transition hover:bg-primary-subtle/40"
                  >
                    <span className="truncate text-sm font-semibold">{t.topicName}</span>
                    <span className="shrink-0 text-sm font-bold" style={{ color: masteryColor(t.mastery) }}>
                      {Math.round(t.mastery * 100)}%
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
