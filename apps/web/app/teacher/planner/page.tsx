"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarPlus, Users, ClipboardList, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { ZereAvatar } from "@/components/ai/zere";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { AiChatPanel, type ChatMessage } from "@/components/ai/chat-panel";
import { WidgetRenderer } from "@/components/ai/widgets";
import { teacherService } from "@/lib/services/teacher";
import type { Recommendation } from "@/lib/types";

export default function PlannerPage() {
  const qc = useQueryClient();
  const classes = useQuery({
    queryKey: ["teacher-classes"],
    queryFn: () => import("@/lib/api/client").then(async ({ api }) => {
      const me = await api.get<{ teacher?: { id: string }; role?: string }>("/auth/me");
      if (!me.teacher) return [];
      return teacherService.classes(me.teacher.id);
    }),
  });
  const [classId, setClassId] = useState<string | null>(null);
  const active = classId ?? classes.data?.[0]?.id ?? "";

  const recommendations = useQuery({
    queryKey: ["recs", active],
    queryFn: () => teacherService.recommendations(active, "pending"),
    enabled: !!active,
  });

  const approve = useMutation({
    mutationFn: ({ id, edits }: { id: string; edits?: Record<string, unknown> }) =>
      teacherService.approve(id, edits),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["recs", active] }),
  });
  const reject = useMutation({
    mutationFn: (id: string) => teacherService.reject(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["recs", active] }),
  });

  return (
    <div className="mx-auto flex h-[calc(100dvh-10rem)] max-w-3xl flex-col lg:h-[calc(100dvh-8rem)]">
      <motion.header
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-primary-subtle via-surface to-surface p-5 shadow-card sm:p-6"
      >
        <div
          className="pointer-events-none absolute -right-10 -top-14 size-44 rounded-full opacity-25 blur-2xl"
          style={{ background: "radial-gradient(circle,#A78BFA,transparent)" }}
          aria-hidden
        />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4 sm:gap-5">
            <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
              <ZereAvatar size={96} mood="happy" float />
            </motion.div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight sm:text-3xl font-display">Zere AI</h1>
                <span className="rounded-full bg-primary-light px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-primary">
                  ИИ-планировщик
                </span>
              </div>
              <p className="mt-1 text-sm text-text-2">
                Я изучила статистику вашего класса и готова предложить план следующего урока.
              </p>
            </div>
          </div>

        </div>

        <ul className="mt-4 grid gap-2 sm:grid-cols-3">
          {[
            { icon: <Users className="size-4" />, color: "#7C3AED", text: "Вижу уровень каждого ученика" },
            { icon: <ClipboardList className="size-4" />, color: "#0EA5E9", text: "Соберу план урока по слабым темам" },
            { icon: <AlertTriangle className="size-4" />, color: "#EF4444", text: "Найду тех, кто в зоне риска" },
          ].map((f, i) => (
            <motion.li
              key={f.text}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 * i }}
              className="flex items-center gap-2 rounded-lg bg-white/70 px-3 py-2 text-xs font-semibold text-text shadow-sm ring-1 ring-border"
            >
              <span className="grid size-7 shrink-0 place-items-center rounded-md text-white" style={{ background: f.color }}>
                {f.icon}
              </span>
              {f.text}
            </motion.li>
          ))}
        </ul>
      </motion.header>

      {/* Class selector (planner-specific, styled like tutor chips) */}
      <div className="-mt-1">
        <select
          value={active}
          onChange={(e) => setClassId(e.target.value)}
          aria-label="Класс"
          className="h-10 rounded-full border-2 border-border bg-surface px-4 text-sm font-bold text-text-2 transition focus:border-primary focus:outline-none"
        >
          <option value="">— выберите класс —</option>
          {(classes.data ?? []).map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Pending recommendations */}
      {(recommendations.data ?? []).length > 0 && (
        <section className="rounded-xl border border-border bg-surface p-5 shadow-card">
          <h2 className="mb-3 font-black">Рекомендации на рассмотрении</h2>
          <ul className="space-y-3">
            {(recommendations.data as Recommendation[]).map((r) => (
              <li key={r.id} className="rounded-lg border border-primary/25 bg-primary-subtle p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="primary">{r.type.replace("_", " ")}</Badge>
                  <span className="text-xs text-text-3">{new Date(r.createdAt).toLocaleString("ru-RU")}</span>
                </div>
                <p className="mt-2 text-sm text-text">{r.reasoning}</p>
                <details className="mt-2 text-xs text-text-2">
                  <summary className="cursor-pointer font-semibold">Payload</summary>
                  <pre className="mt-1 overflow-x-auto rounded bg-surface p-2">{JSON.stringify(r.recommendation, null, 2)}</pre>
                </details>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="success" loading={approve.isPending} onClick={() => approve.mutate({ id: r.id })}>
                    Одобрить
                  </Button>
                  <Button size="sm" variant="danger" loading={reject.isPending} onClick={() => reject.mutate(r.id)}>
                    Отклонить
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Chat */}
        {!active ? (
          <p className="py-16 text-center text-sm text-text-3">Выберите класс, чтобы начать.</p>
        ) : (
          <OrchestratorChat
            classId={active}
            onConfirmed={async () => {
              // After CONFIRM approve in chat, refresh pending list
              await qc.invalidateQueries({ queryKey: ["recs", active] });
            }}
            latestRec={(recommendations.data as Recommendation[] | undefined)?.find(
              (r) => r.type === "LESSON_PLAN",
            )}
            onApprove={(id, edits) => approve.mutate({ id, edits })}
            onReject={(id) => reject.mutate(id)}
            approving={approve.isPending}
          />
        )}

      {/* Footer hint */}
      <p className="flex items-center justify-center gap-1.5 pb-1 pt-1 text-center text-[11px] text-text-3">
        <CalendarPlus className="size-3.5" /> Одобренный план Зере автоматически станет уроком в календаре класса
      </p>

      {/* Approved result note */}
      {approve.isSuccess && (
        <p className="rounded-lg bg-[#ECFDF5] p-3 text-sm font-semibold text-[#047857]">
          Рекомендация одобрена{approve.data?.lessonId ? ` — создан урок (${approve.data.lessonId.slice(0, 8)}…)` : ""}.
        </p>
      )}
    </div>
  );
}

function OrchestratorChat({
  classId,
  latestRec,
  onApprove,
  onReject,
  approving,
}: {
  classId: string;
  onConfirmed?: () => Promise<void>;
  latestRec?: Recommendation;
  onApprove?: (id: string, edits?: Record<string, unknown>) => void;
  onReject?: (id: string) => void;
  approving?: boolean;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [editsJson, setEditsJson] = useState("{}");

  // Render CONFIRM widgets inside chat with action buttons by wrapping WidgetRenderer.
  return (
    <>
      <AiChatPanel
        key={classId}
        className="min-h-0 flex-1 pt-3"
        scenario="orchestrator/chat"
        autoStartGreeting
        greeting={`Привет! Я Зере — изучила статистику вашего класса. Спросите: «Что делать на следующем уроке?»`}
        classId={classId}
        assistantAvatar={<ZereAvatar size={30} mood="thinking" />}
        quickPrompts={[
          "Что делать на следующем уроке?",
          "Кого из учеников стоит поддержать?",
          "Предложи план урока по слабой теме",
        ]}
      />
      {/* Action bar bound to latest pending recommendation */}
      {latestRec && (
        <div className="mt-3 rounded-lg border border-primary/30 bg-primary-subtle p-4">
          <p className="flex items-center gap-2 text-sm font-bold">
            <CalendarPlus className="size-4 text-primary" />
            Последнее предложение ИИ готово к решению
          </p>
          <p className="mt-1 line-clamp-2 text-xs text-text-2">{latestRec.reasoning}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="success" loading={approving} onClick={() => onApprove?.(latestRec.id)}>
              Принять план
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setEditOpen(true)}>
              Редактировать
            </Button>
            <Button size="sm" variant="outline" onClick={() => onReject?.(latestRec.id)}>
              Отклонить
            </Button>
          </div>
        </div>
      )}

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Правки рекомендации">
        <p className="text-sm text-text-2">
          Отредактируйте payload (JSON). Он пройдёт повторную валидацию на бэкенде при одобрении.
        </p>
        <textarea
          value={editsJson}
          onChange={(e) => setEditsJson(e.target.value)}
          rows={7}
          className="mt-3 w-full rounded-md border-2 border-border px-3 py-2 font-mono text-xs outline-none focus:border-primary"
        />
        <Button
          className="mt-4"
          fullWidth
          size="lg"
          loading={approving}
          onClick={() => {
            try {
              const edits = JSON.parse(editsJson) as Record<string, unknown>;
              if (latestRec) onApprove?.(latestRec.id, edits);
              setEditOpen(false);
            } catch {
              alert("Некорректный JSON");
            }
          }}
        >
          Сохранить и одобрить
        </Button>
      </Modal>
    </>
  );
}

// Re-export so tree-shaking keeps widget renderer referenced for orchestrator CONFIRM previews.
void WidgetRenderer;
