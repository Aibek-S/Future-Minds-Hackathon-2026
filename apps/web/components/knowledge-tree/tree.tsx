"use client";

import { motion } from "framer-motion";
import { Check, Lock, Sparkles, Star } from "lucide-react";
import type { KnowledgeTopic, Roadmap, Topic } from "@/lib/types";
import { masteryColor } from "@/lib/subjects";
import { clsx } from "clsx";

export type NodeStatus = "completed" | "current" | "unlocked" | "locked" | "bonus" | "challenge";

export interface TreeNodeData {
  topic: Topic;
  status: NodeStatus;
  mastery: number | null;
  reason?: string;
}

/** Derives real node states from backend data — never invented. */
export function buildTree(
  topics: Topic[],
  knowledge: KnowledgeTopic[],
  roadmap: Roadmap,
): TreeNodeData[] {
  const kMap = new Map(knowledge.map((k) => [k.topicId, k]));
  const currentId = roadmap.current?.topicId;
  const nextById = new Map((roadmap.next ?? []).map((n) => [n.topicId, n]));
  const completedNames = new Set(roadmap.completed ?? []);

  return topics.map((topic) => {
    const k = kMap.get(topic.id);
    const n = nextById.get(topic.id);
    let status: NodeStatus;
    if (completedNames.has(topic.name) || (k && k.mastery >= 0.7)) status = "completed";
    else if (topic.id === currentId) status = "current";
    else if (n && !n.prerequisiteMet) status = "locked";
    else if (topic.prerequisites.length === 0) status = "unlocked";
    else {
      // Unlocked only when all prerequisite masteries ≥ threshold known to backend (0.4).
      const met = topic.prerequisites.every((pid) => {
        const pk = kMap.get(pid);
        return !pk || pk.mastery >= 0.4 || pk.prerequisiteMet;
      });
      status = met ? "unlocked" : "locked";
    }
    return { topic, status, mastery: k ? k.mastery : null, reason: topic.id === currentId ? roadmap.current?.reason : undefined };
  });
}

const STYLES: Record<NodeStatus, { bg: string; border: string; text: string; icon: React.ReactNode }> = {
  completed: {
    bg: "#10B981",
    border: "#059669",
    text: "#fff",
    icon: <Check className="size-7" strokeWidth={3} />,
  },
  current: {
    bg: "#7C3AED",
    border: "#6D28D9",
    text: "#fff",
    icon: <Sparkles className="size-7" />,
  },
  unlocked: {
    bg: "#FFFFFF",
    border: "#C4B5FD",
    text: "#6D28D9",
    icon: null,
  },
  locked: {
    bg: "#E2E8F0",
    border: "#CBD5E1",
    text: "#94A3B8",
    icon: <Lock className="size-6" />,
  },
  bonus: {
    bg: "#F59E0B",
    border: "#D97706",
    text: "#fff",
    icon: <Star className="size-7" />,
  },
  challenge: {
    bg: "#EF4444",
    border: "#DC2626",
    text: "#fff",
    icon: <Star className="size-7" />,
  },
};

export function TreeNode({
  node,
  onClick,
  index,
}: {
  node: TreeNodeData;
  onClick: () => void;
  index: number;
}) {
  const s = STYLES[node.status];
  return (
    <motion.button
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ delay: Math.min(index * 0.04, 0.4), type: "spring", stiffness: 200, damping: 20 }}
      whileHover={node.status !== "locked" ? { scale: 1.06 } : undefined}
      whileTap={node.status !== "locked" ? { scale: 0.96 } : undefined}
      onClick={onClick}
      aria-label={`${node.topic.name}, ${node.status}${node.mastery != null ? `, мастерство ${Math.round(node.mastery * 100)}%` : ""}`}
      className={clsx("relative flex flex-col items-center gap-2 focus-visible:outline-2 focus-visible:outline-primary rounded-xl")}
    >
      <span
        className={clsx(
          "grid size-[72px] place-items-center rounded-2xl border-b-[5px] shadow-card transition-transform",
          node.status === "current" && "animate-[pulse-current_2s_ease-in-out_infinite]",
        )}
        style={{ background: s.bg, borderColor: s.border, color: s.text }}
      >
        {node.mastery != null && node.status !== "locked" && node.status !== "current" ? (
          <span className="text-sm font-black">{Math.round(node.mastery * 100)}%</span>
        ) : (
          s.icon
        )}
      </span>
      <span
        className={clsx(
          "max-w-[120px] text-center text-xs font-bold leading-tight",
          node.status === "locked" ? "text-text-3" : "text-text",
        )}
      >
        {node.topic.name}
      </span>
      {node.status === "current" && (
        <span className="absolute -right-1 -top-1 grid size-6 place-items-center rounded-full bg-warning text-white shadow-card">
          <Sparkles className="size-3.5" />
        </span>
      )}
    </motion.button>
  );
}

/**
 * Vertical learning path (Duolingo-style). Levels are derived from real
 * prerequisite depth; a soft spine connects consecutive levels.
 */
export function KnowledgeTree({ nodes, onSelect }: { nodes: TreeNodeData[]; onSelect: (n: TreeNodeData) => void }) {
  const depthOf = (t: Topic, memo: Map<string, number>): number => {
    const cached = memo.get(t.id);
    if (cached != null) return cached;
    const d =
      t.prerequisites.length === 0
        ? 0
        : 1 +
          Math.max(
            ...t.prerequisites.map((pid) => {
              const p = nodes.find((n) => n.topic.id === pid)?.topic;
              return p ? depthOf(p, memo) : -1;
            }),
          );
    memo.set(t.id, d);
    return d;
  };

  const memo = new Map<string, number>();
  const levels = new Map<number, TreeNodeData[]>();
  for (const n of nodes) {
    const d = depthOf(n.topic, memo);
    if (!levels.has(d)) levels.set(d, []);
    levels.get(d)!.push(n);
  }
  const sortedLevels = [...levels.entries()].sort((a, b) => a[0] - b[0]);

  return (
    <div className="relative mx-auto w-fit">
      {/* Spine */}
      <div className="absolute left-1/2 top-0 h-full w-1 -translate-x-1/2 rounded-full bg-border/70" aria-hidden />
      <div className="relative space-y-8 py-2">
        {sortedLevels.map(([depth, levelNodes], li) => (
          <div key={depth}>
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="mb-3 text-center text-[11px] font-black uppercase tracking-[0.25em] text-text-3"
            >
              Уровень {li + 1}
            </motion.p>
            <div
              className={clsx(
                "flex items-start justify-center gap-x-14 gap-y-6",
                li % 2 ? "translate-x-8" : "-translate-x-8",
              )}
            >
              {levelNodes.map((n, i) => (
                <TreeNode key={n.topic.id} node={n} index={i} onClick={() => onSelect(n)} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
