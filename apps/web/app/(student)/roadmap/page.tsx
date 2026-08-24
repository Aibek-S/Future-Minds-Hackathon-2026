"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowRight, BookMarked, Check, Lock, Play } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MasteryBar } from "@/components/ui/progress";
import { Badge } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { ErrorState, TreeSkeleton, EmptyState } from "@/components/ui/states";
import { KnowledgeTree, buildTree, type TreeNodeData } from "@/components/knowledge-tree/tree";
import { studentsService } from "@/lib/services/students";
import { topicsService } from "@/lib/services/topics";
import { useMe } from "@/lib/hooks/use-auth";
import { subjectTheme } from "@/lib/subjects";

export default function RoadmapPage() {
  const me = useMe();
  const studentId = me.data?.student?.id;

  const subjects = useQuery({
    queryKey: ["subjects", studentId],
    queryFn: () => studentsService.subjects(studentId!),
    enabled: !!studentId,
  });
  const [activeSubject, setActiveSubject] = useState<string | null>(null);
  const subjectId = activeSubject ?? subjects.data?.[0]?.id ?? null;
  const theme = subjectTheme(subjectId ?? "", 0);

  const topics = useQuery({
    queryKey: ["topics", subjectId],
    queryFn: () => topicsService.list(subjectId!),
    enabled: !!subjectId,
  });
  const knowledge = useQuery({
    queryKey: ["knowledge", studentId, subjectId],
    queryFn: () => studentsService.knowledge(studentId!, subjectId!),
    enabled: !!studentId && !!subjectId,
  });
  const roadmap = useQuery({
    queryKey: ["roadmap", studentId, subjectId],
    queryFn: () => studentsService.roadmap(studentId!, subjectId!),
    enabled: !!studentId && !!subjectId,
  });

  const [selected, setSelected] = useState<TreeNodeData | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);

  const loading =
    !studentId || subjects.isLoading || topics.isLoading || knowledge.isLoading || roadmap.isLoading;

  const loadError = topics.isError || knowledge.isError || roadmap.isError;
  function retryAll() {
    void topics.refetch();
    void knowledge.refetch();
    void roadmap.refetch();
  }

  const nodes =
    !loading && topics.data && knowledge.data && roadmap.data
      ? buildTree(topics.data, knowledge.data, roadmap.data)
      : [];

  // Section header progress from real data
  const completedCount = nodes.filter((n) => n.status === "completed").length;
  const progress = nodes.length ? completedCount / nodes.length : 0;
  const currentTopicName = roadmap.data?.current?.topicName ?? subjects.data?.[0]?.name ?? "";

  return (
    <div>
      {/* Subject chips */}
      <div className="scroll-thin -mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1">
        {(subjects.data ?? []).map((s, i) => {
          const t = subjectTheme(s.id, i);
          return (
            <button
              key={s.id}
              onClick={() => setActiveSubject(s.id)}
              className={`shrink-0 rounded-full border-2 px-4 py-2 text-sm font-bold transition ${
                subjectId === s.id ? "text-white shadow-card" : "border-border bg-surface text-text-2 hover:border-primary/30"
              }`}
              style={subjectId === s.id ? { background: t.accent, borderColor: t.accent } : undefined}
            >
              {s.name}
            </button>
          );
        })}
      </div>

      {loading ? (
        <TreeSkeleton />
      ) : loadError ? (
        <ErrorState
          title="Не удалось загрузить карту знаний"
          body="Проверьте подключение к серверу и попробуйте ещё раз."
          onRetry={retryAll}
        />
      ) : (subjects.data ?? []).length === 0 ? (
        <EmptyState
          emoji="🗺"
          title="Пока нет предметов"
          body="Пройдите диагностику или попросите учителя добавить вас в класс."
          action={
            <Link href="/diagnostic">
              <Button>Пройти диагностику</Button>
            </Link>
          }
        />
      ) : (
        <>
          {/* Section header */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-2 text-center"
          >
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-text-3">
              Раздел 1 · Блок 1
            </p>
            <h1 className="mt-1 text-2xl font-black sm:text-3xl">{currentTopicName || "Ваш путь"}</h1>
            <div className="mx-auto mt-3 flex max-w-xs items-center gap-3">
              <MasteryBar mastery={progress} color={theme.accent} showLabel={false} />
              <span className="text-sm font-extrabold text-text-2">{Math.round(progress * 100)}%</span>
            </div>
            <button
              onClick={() => setGuideOpen(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-md border-2 border-primary-light bg-primary-subtle px-4 py-2 text-sm font-bold text-primary transition hover:bg-primary-light"
            >
              <BookMarked className="size-4" /> Справочник
            </button>
          </motion.section>

          {/* Guidebook — real unit overview from backend data */}
          <Modal open={guideOpen} onClose={() => setGuideOpen(false)} title={`Справочник · ${subjects.data?.find((s) => s.id === subjectId)?.name ?? ""}`}>
            <div className="mb-4 flex items-center justify-between rounded-lg bg-primary-subtle p-4">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-primary">Прогресс блока</p>
                <p className="mt-0.5 text-lg font-black">
                  {completedCount} из {nodes.length} тем · {Math.round(progress * 100)}%
                </p>
              </div>
              <span className="grid size-12 place-items-center rounded-full bg-white text-xl shadow-card">📖</span>
            </div>
            <ul className="space-y-1.5">
              {nodes.map((n) => (
                <li key={n.topic.id} className="flex items-center gap-3 rounded-md border border-border px-3 py-2">
                  <span
                    className={`grid size-7 shrink-0 place-items-center rounded-full ${
                      n.status === "completed"
                        ? "bg-success text-white"
                        : n.status === "current"
                          ? "bg-primary text-white"
                          : n.status === "locked"
                            ? "bg-surface-2 text-text-3"
                            : "bg-primary-light text-primary"
                    }`}
                  >
                    {n.status === "completed" ? (
                      <Check className="size-4" strokeWidth={3} />
                    ) : n.status === "current" ? (
                      <Play className="size-3.5" fill="currentColor" />
                    ) : n.status === "locked" ? (
                      <Lock className="size-3.5" />
                    ) : (
                      <ArrowRight className="size-3.5" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">{n.topic.name}</span>
                  {n.mastery != null && (
                    <span className="shrink-0 text-xs font-extrabold text-text-2">{Math.round(n.mastery * 100)}%</span>
                  )}
                </li>
              ))}
            </ul>
            {(() => {
              const nextUp = nodes.find((n) => n.status === "current") ?? nodes.find((n) => n.status === "unlocked");
              return nextUp ? (
                <Link href={`/lesson/${nextUp.topic.id}`} onClick={() => setGuideOpen(false)}>
                  <Button size="lg" fullWidth className="mt-5">
                    Продолжить: {nextUp.topic.name} <ArrowRight className="size-4" />
                  </Button>
                </Link>
              ) : null;
            })()}
          </Modal>

          {/* Tree */}
          <section aria-label="Дерево знаний">
            <KnowledgeTree nodes={nodes} onSelect={setSelected} />
          </section>
        </>
      )}

      {/* Topic details */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.topic.name}>
        {selected && (
          <TopicDetailsSheet
            node={selected}
            blockedByNames={(selected.topic.prerequisites ?? [])
              .map((pid) => nodes.find((n) => n.topic.id === pid)?.topic.name)
              .filter(Boolean)
              .join(", ")}
          />
        )}
      </Modal>
    </div>
  );
}

function TopicDetailsSheet({ node, blockedByNames }: { node: TreeNodeData; blockedByNames: string }) {
  const locked = node.status === "locked";
  const isCurrent = node.status === "current";
  const reasonBullets = node.reason
    ? node.reason
        .split(/[,;]\s*/)
        .map((r) => r.trim())
        .filter(Boolean)
    : [];

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={node.status === "completed" ? "success" : node.status === "current" ? "primary" : node.status === "locked" ? "neutral" : "info"}>
          {node.status === "completed" ? "Пройдено" : isCurrent ? "Текущая тема" : locked ? "Закрыта" : "Открыта"}
        </Badge>
        {node.mastery != null && (
          <span className="text-sm font-bold text-text-2">
            Мастерство {Math.round(node.mastery * 100)}%
          </span>
        )}
      </div>

      {isCurrent && reasonBullets.length > 0 && (
        <div className="mt-4 rounded-lg bg-primary-subtle p-4">
          <p className="text-sm font-black uppercase tracking-wide text-primary">Почему эта тема?</p>
          <ul className="mt-2 space-y-1.5">
            {reasonBullets.map((r) => (
              <li key={r} className="flex items-start gap-2 text-sm text-text">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      {node.mastery != null && (
        <div className="mt-4">
          <MasteryBar mastery={node.mastery} size="lg" />
        </div>
      )}

      {locked && (
        <p className="mt-4 flex items-center gap-2 rounded-lg bg-surface-2 p-3 text-sm text-text-2">
          <Lock className="size-4 shrink-0" />
          Тема закрыта{blockedByNames ? `. Сначала завершите: ${blockedByNames}` : ". Завершите предыдущие темы."}
        </p>
      )}

      {locked ? (
        <Button size="xl" disabled fullWidth className="mt-6">
          <Lock className="size-4" /> Закрыто
        </Button>
      ) : (
        <Link href={`/lesson/${node.topic.id}`}>
          <Button size="xl" fullWidth className="mt-6">
            Начать урок <ArrowRight className="size-5" />
          </Button>
        </Link>
      )}
    </div>
  );
}
