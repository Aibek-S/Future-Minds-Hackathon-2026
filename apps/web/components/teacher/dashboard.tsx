"use client";

import { motion } from "framer-motion";
import type { ClassStudent, HeatmapResponse } from "@/lib/types";
import { heatStatus } from "@/lib/subjects";
import { clsx } from "clsx";
import { Skeleton } from "@/components/ui/states";

/* ---------------- Metric card ---------------- */

export function MetricCard({
  value,
  label,
  accent = "#7C3AED",
  hint,
}: {
  value: string | number;
  label: string;
  accent?: string;
  hint?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-surface p-5 shadow-card"
    >
      <p className="text-3xl font-black" style={{ color: accent }}>
        {value}
      </p>
      <p className="mt-1 text-sm font-bold uppercase tracking-wide text-text-2">{label}</p>
      {hint && <p className="mt-0.5 text-xs text-text-3">{hint}</p>}
    </motion.div>
  );
}

/* ---------------- Heatmap ---------------- */

const HEAT_STYLE = {
  GREEN: { bg: "#D1FAE5", text: "#047857", label: "≥70%" },
  YELLOW: { bg: "#FEF3C7", text: "#B45309", label: "40–69%" },
  RED: { bg: "#FEE2E2", text: "#B91C1C", label: "<40%" },
} as const;

export function Heatmap({
  data,
  onStudentClick,
  onTopicClick,
}: {
  data?: HeatmapResponse;
  onStudentClick?: (studentId: string) => void;
  onTopicClick?: (topicId: string) => void;
}) {
  if (!data) {
    return (
      <div className="space-y-2">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }
  const topics = data.topics ?? [];
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-separate border-spacing-y-1.5">
        <thead>
          <tr>
            <th className="w-40 pb-2 text-left text-xs font-black uppercase tracking-wider text-text-3">Ученик</th>
            {topics.map((t) => (
              <th key={t.id} className="pb-2">
                <button
                  onClick={() => onTopicClick?.(t.id)}
                  className="max-w-[110px] truncate text-xs font-bold text-text-2 underline-offset-2 hover:text-primary hover:underline"
                  title={t.name}
                >
                  {t.name}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(data.students ?? []).map((s) => (
            <tr key={s.studentId}>
              <td className="pr-3">
                <button
                  onClick={() => onStudentClick?.(s.studentId)}
                  className="truncate text-sm font-bold hover:text-primary hover:underline"
                >
                  {s.studentName}
                </button>
              </td>
              {topics.map((t) => {
                const cell = (s.topics ?? []).find((x) => x.topicId === t.id);
                const status = cell?.status ?? null;
                const style = status ? HEAT_STYLE[status as keyof typeof HEAT_STYLE] : null;
                return (
                  <td key={t.id} className="px-1">
                    <div
                      role="cell"
                      aria-label={`${s.studentName}, ${t.name}: ${style?.label ?? "нет данных"}`}
                      title={cell ? `${Math.round(cell.mastery * 100)}%` : "нет данных"}
                      className={clsx(
                        "mx-auto grid h-9 w-full max-w-[110px] place-items-center rounded-md text-xs font-extrabold transition hover:scale-[1.04]",
                        !style && "bg-surface-2 text-text-3",
                      )}
                      style={style ? { background: style.bg, color: style.text } : undefined}
                    >
                      {cell ? `${Math.round(cell.mastery * 100)}%` : "—"}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
          {(data.students ?? []).length === 0 && (
            <tr>
              <td colSpan={topics.length + 1} className="py-8 text-center text-sm text-text-3">
                В классе пока нет учеников.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 text-xs font-semibold text-text-2">
        {(Object.keys(HEAT_STYLE) as Array<keyof typeof HEAT_STYLE>).map((k) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className="size-3.5 rounded" style={{ background: HEAT_STYLE[k].bg }} />
            {HEAT_STYLE[k].label}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Students table ---------------- */

export function studentStatus(mastery: number): { label: string; tone: "success" | "warning" | "error"; color: string } {
  if (mastery >= 0.6) return { label: "В норме", tone: "success", color: "#10B981" };
  if (mastery >= 0.4) return { label: "Требует внимания", tone: "warning", color: "#F59E0B" };
  return { label: "В зоне риска", tone: "error", color: "#EF4444" };
}

export function StudentTable({
  students,
  weakByStudent,
  onRowClick,
}: {
  students?: ClassStudent[];
  /** topicName by studentId */
  weakByStudent?: Record<string, string>;
  onRowClick?: (s: ClassStudent) => void;
}) {
  if (!students) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface shadow-card">
      <table className="w-full min-w-[680px] text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs font-black uppercase tracking-wider text-text-3">
            <th className="px-4 py-3">Ученик</th>
            <th className="px-4 py-3">Мастерство</th>
            <th className="px-4 py-3">Тренд</th>
            <th className="hidden px-4 py-3 sm:table-cell">Слабейшая тема</th>
            <th className="hidden px-4 py-3 md:table-cell">Активность</th>
            <th className="px-4 py-3">Статус</th>
          </tr>
        </thead>
        <tbody>
          {students.map((s) => {
            const st = studentStatus(s.mastery);
            return (
              <tr
                key={s.id}
                onClick={() => onRowClick?.(s)}
                className="cursor-pointer border-b border-border/60 transition last:border-0 hover:bg-primary-subtle/50"
              >
                <td className="px-4 py-3 font-bold">{s.name}</td>
                <td className="px-4 py-3 font-extrabold" style={{ color: st.color }}>
                  {Math.round(s.mastery * 100)}%
                </td>
                <td className="px-4 py-3">{s.trend === "improving" ? "📈 растёт" : s.trend === "declining" ? "📉 снижается" : "➖ стабильно"}</td>
                <td className="hidden max-w-[160px] truncate px-4 py-3 sm:table-cell">{weakByStudent?.[s.id] ?? "—"}</td>
                <td className="hidden px-4 py-3 text-text-2 md:table-cell">
                  {s.lastActive ? new Date(s.lastActive).toLocaleDateString("ru-RU") : "—"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold"
                    style={{ background: `${st.color}18`, color: st.color }}
                  >
                    <span className="size-1.5 rounded-full" style={{ background: st.color }} />
                    {st.label}
                  </span>
                </td>
              </tr>
            );
          })}
          {students.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-10 text-center text-text-3">
                Учеников нет. Поделитесь кодом класса.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
