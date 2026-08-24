"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { MasteryBar, ProgressBar } from "@/components/ui/progress";
import { topicsService } from "@/lib/services/topics";

export interface SubjectCardData {
  id: string;
  name: string;
  avgMastery: number;
  topicCount: number;
  topicsCompleted: number;
}

/** Expandable subject card (shared by Home right column and Learn page). */
export function SubjectCard({
  subject,
  accent,
  gradient,
  index,
  expanded,
  onToggle,
}: {
  subject: SubjectCardData;
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
      transition={{ delay: Math.min(index * 0.06, 0.3) }}
      className="overflow-hidden rounded-xl border-2 bg-surface shadow-card transition-colors"
      style={{ borderColor: expanded ? accent : undefined }}
    >
      <button onClick={onToggle} className="w-full p-4 text-left sm:p-5" aria-expanded={expanded}>
        <div className="flex items-center gap-3">
          <span
            className="grid size-12 shrink-0 place-items-center rounded-xl text-lg font-black text-white shadow-card"
            style={{ background: gradient }}
            aria-hidden
          >
            {subject.name.slice(0, 1)}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-black">{subject.name}</h3>
            <div className="mt-1.5 max-w-[220px]">
              <MasteryBar mastery={subject.avgMastery} color={accent} showLabel size="sm" />
            </div>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between text-xs sm:text-sm">
          <span className="font-semibold text-text-2">
            {subject.topicsCompleted} / {subject.topicCount} тем
          </span>
          <span className="flex items-center gap-1 font-bold" style={{ color: accent }}>
            {expanded ? "Свернуть" : "Открыть"}{" "}
            <ArrowRight className={`size-4 transition-transform ${expanded ? "rotate-90" : ""}`} />
          </span>
        </div>
        <ProgressBar value={subject.topicCount ? subject.topicsCompleted / subject.topicCount : 0} height={6} className="mt-3" />
      </button>

      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          className="border-t border-border bg-background px-4 py-3 sm:px-5 sm:py-4"
        >
          {topics.isLoading && <p className="text-sm text-text-3">Загружаем темы…</p>}
          <ul className="space-y-1">
            {(topics.data ?? []).map((tp) => (
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
            {(topics.data ?? []).length === 0 && !topics.isLoading && (
              <li className="px-3 py-2 text-sm text-text-3">Тем пока нет.</li>
            )}
          </ul>
        </motion.div>
      )}
    </motion.div>
  );
}
