"use client";

import { motion } from "framer-motion";
import { Check, Lock, Play, Star } from "lucide-react";
import type { KnowledgeTopic, Roadmap, Topic } from "@/lib/types";
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
      const met = topic.prerequisites.every((pid) => {
        const pk = kMap.get(pid);
        return !pk || pk.mastery >= 0.4 || pk.prerequisiteMet;
      });
      status = met ? "unlocked" : "locked";
    }
    return { topic, status, mastery: k ? k.mastery : null, reason: topic.id === currentId ? roadmap.current?.reason : undefined };
  });
}

/* ================= Layout engine ================= */

const R = 36;            // node circle radius
const GAP_Y = 126;       // vertical distance between levels
const TRUNK_WIGGLE = [0, -64, -24, 40, 8, -48, 56]; // serpentine trunk offsets

interface Placed extends TreeNodeData { x: number; y: number }

function layout(nodes: TreeNodeData[]): { placed: Placed[]; width: number; height: number } {
  const memo = new Map<string, number>();
  const indexOf = new Map(nodes.map((n, i) => [n.topic.id, i]));

  const depthOf = (t: Topic): number => {
    const c = memo.get(t.id);
    if (c != null) return c;
    const d =
      t.prerequisites.length === 0
        ? 0
        : 1 + Math.max(...t.prerequisites.map((pid) => {
            const p = nodes.find((n) => n.topic.id === pid)?.topic;
            return p ? depthOf(p) : -1;
          }));
    memo.set(t.id, d);
    return d;
  };

  const levelsMap = new Map<number, Placed[]>();
  for (const n of nodes) {
    const d = depthOf(n.topic);
    if (!levelsMap.has(d)) levelsMap.set(d, []);
    levelsMap.get(d)!.push({ ...n, x: 0, y: 0 });
  }
  const depths = [...levelsMap.keys()].sort((a, b) => a - b);

  let maxAbsX = 0;
  depths.forEach((d, li) => {
    const row = levelsMap.get(d)!.sort((a, b) => indexOf.get(a.topic.id)! - indexOf.get(b.topic.id)!);
    const y = li * GAP_Y + GAP_Y / 2;

    if (row.length === 1) {
      // Trunk node — serpentine wiggle keeps the path playful
      const x = TRUNK_WIGGLE[li % TRUNK_WIGGLE.length];
      row[0].x = x;
      row[0].y = y;
      maxAbsX = Math.max(maxAbsX, Math.abs(x));
    } else {
      // Branch fan — spread children around the trunk symmetrically
      const spread = Math.min(96 * (row.length - 1), 260);
      row.forEach((n, i) => {
        const t = row.length === 1 ? 0.5 : i / (row.length - 1);
        n.x = Math.round(-spread / 2 + spread * t) + (i % 2 ? 18 : -18);
        n.y = y + (i % 2 ? 14 : -10); // slight organic jitter
        maxAbsX = Math.max(maxAbsX, Math.abs(n.x));
      });
    }
  });

  const width = (maxAbsX + R + 34) * 2;
  const height = depths.length * GAP_Y + 60;
  const placed = depths.flatMap((d) => levelsMap.get(d)!).map((p) => ({
    ...p,
    x: width / 2 + p.x,
    y: p.y + 20,
  }));
  return { placed, width, height };
}

/** Edge style driven by the CHILD status (where the learner is heading). */
function edgeStyle(status: NodeStatus): { stroke: string; width: number; dash?: string } {
  switch (status) {
    case "completed": return { stroke: "#10B981", width: 4 };
    case "current":   return { stroke: "#7C3AED", width: 5 };
    case "unlocked":  return { stroke: "#A78BFA", width: 3.5 };
    default:          return { stroke: "#CBD5E1", width: 2.5, dash: "3 9" };
  }
}

/* ================= Visuals ================= */

const STYLES: Record<NodeStatus, { bg: string; border: string; text: string; icon: React.ReactNode }> = {
  completed: { bg: "#10B981", border: "#059669", text: "#fff", icon: <Check className="size-7" strokeWidth={3} /> },
  current:   { bg: "#7C3AED", border: "#6D28D9", text: "#fff", icon: <Play className="size-6" fill="currentColor" /> },
  unlocked:  { bg: "#FFFFFF", border: "#C4B5FD", text: "#6D28D9", icon: null },
  locked:    { bg: "#E2E8F0", border: "#CBD5E1", text: "#94A3B8", icon: <Lock className="size-6" /> },
  bonus:     { bg: "#F59E0B", border: "#D97706", text: "#fff", icon: <Star className="size-7" /> },
  challenge: { bg: "#EF4444", border: "#DC2626", text: "#fff", icon: <Star className="size-7" /> },
};

function NodeCircle({ node, onClick, i }: { node: Placed; onClick: () => void; i: number }) {
  const s = STYLES[node.status];
  const showPct = node.mastery != null && node.status !== "locked" && node.status !== "current";
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.5 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: "-30px" }}
      transition={{ delay: Math.min(i * 0.06, 0.5), type: "spring", stiffness: 240, damping: 16 }}
      whileHover={node.status !== "locked" ? { scale: 1.09 } : undefined}
      whileTap={node.status !== "locked" ? { scale: 0.95 } : undefined}
      onClick={onClick}
      aria-label={`${node.topic.name}, ${node.status}${node.mastery != null ? `, мастерство ${Math.round(node.mastery * 100)}%` : ""}`}
      className="absolute z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center focus-visible:outline-2 focus-visible:outline-primary"
      style={{ left: node.x, top: node.y }}
    >
      <span
        className={clsx(
          "relative grid size-[72px] place-items-center rounded-full border-b-[5px] shadow-card transition-transform",
          node.status === "current" && "animate-[pulse-current_2s_ease-in-out_infinite]",
        )}
        style={{ background: s.bg, borderColor: s.border, color: s.text }}
      >
        {showPct ? (
          <span className="text-sm font-black">{Math.round(node.mastery! * 100)}%</span>
        ) : (
          s.icon
        )}
        {node.status === "current" && (
          <motion.span
            className="absolute -right-1 -top-1 grid size-6 place-items-center rounded-full bg-warning text-white shadow-card"
            animate={{ rotate: [0, 12, -8, 0] }}
            transition={{ repeat: Infinity, duration: 2.4 }}
          >
            <Star className="size-3.5" fill="currentColor" />
          </motion.span>
        )}
      </span>
      <span
        className={clsx(
          "mt-1.5 max-w-[118px] rounded-md px-1 text-center text-xs font-bold leading-tight",
          node.status === "locked" ? "bg-transparent text-text-3" : "bg-surface/80 text-text backdrop-blur-sm",
        )}
      >
        {node.topic.name}
      </span>
    </motion.button>
  );
}

/**
 * Game-like knowledge map: serpentine trunk + organic branch fans,
 * curved prerequisite edges drawn SVG underneath the nodes.
 */
export function KnowledgeTree({
  nodes,
  onSelect,
}: {
  nodes: TreeNodeData[];
  onSelect: (n: TreeNodeData) => void;
}) {
  const { placed, width, height } = layout(nodes);
  const byId = new Map(placed.map((p) => [p.topic.id, p]));

  const edges: Array<{ d: string; child: NodeStatus; key: string }> = [];
  for (const child of placed) {
    for (const pid of child.topic.prerequisites) {
      const parent = byId.get(pid);
      if (!parent) continue;
      const y0 = parent.y + R + 2;
      const y1 = child.y - R - 26; // leave room for the label above child
      const midY = (y0 + y1) / 2;
      edges.push({
        key: `${pid}->${child.topic.id}`,
        child: child.status,
        d: `M ${parent.x} ${y0} C ${parent.x} ${midY}, ${child.x} ${midY}, ${child.x} ${y1}`,
      });
    }
  }

  return (
    <div className="scroll-thin w-full overflow-x-auto pb-2">
      <div className="relative mx-auto" style={{ width, minWidth: 300, height }}>
        {/* Foliage decorations */}
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          {[
            { l: "8%", t: "4%", s: 120, c: "#EDE9FE" },
            { l: "70%", t: "12%", s: 90, c: "#DCFCE7" },
            { l: "20%", t: "46%", s: 110, c: "#E0F2FE" },
            { l: "62%", t: "62%", s: 130, c: "#EDE9FE" },
            { l: "12%", t: "82%", s: 90, c: "#FEF3C7" },
          ].map((b, i) => (
            <div
              key={i}
              className="absolute rounded-full opacity-60 blur-2xl"
              style={{ left: b.l, top: b.t, width: b.s, height: b.s, background: b.c }}
            />
          ))}
          {["✦", "•", "✦"].map((ch, i) => (
            <span
              key={i}
              className={clsx("absolute text-lg", i === 0 ? "text-warning/50" : "text-primary/25")}
              style={{ left: `${18 + i * 31}%`, top: `${8 + ((i * 37) % 84)}%` }}
            >
              {ch}
            </span>
          ))}
        </div>

        {/* Branch edges */}
        <svg className="absolute inset-0" width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
          {edges.map((e) => {
            const st = edgeStyle(e.child);
            return (
              <motion.path
                key={e.key}
                d={e.d}
                fill="none"
                stroke={st.stroke}
                strokeWidth={st.width}
                strokeDasharray={st.dash}
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                whileInView={{ pathLength: 1, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, ease: "easeOut" }}
              />
            );
          })}
        </svg>

        {/* Nodes */}
        {placed.map((n, i) => (
          <NodeCircle key={n.topic.id} node={n} i={i} onClick={() => onSelect(n)} />
        ))}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs font-bold text-text-2">
        {[
          ["#10B981", "Пройдена"],
          ["#7C3AED", "Текущая"],
          ["#FFFFFF", "Открыта"],
          ["#E2E8F0", "Закрыта"],
        ].map(([c, label]) => (
          <span key={label} className="flex items-center gap-1.5">
            <span
              className={clsx("size-3.5 rounded-full border-2", c === "#FFFFFF" && "border-[#C4B5FD]")}
              style={{ background: c }}
            />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
