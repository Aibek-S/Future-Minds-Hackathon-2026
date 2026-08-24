"use client";

import { Flame, Coins, Brain } from "lucide-react";
import { motion } from "framer-motion";
import { useGamification } from "@/lib/stores/gamification";

/** 🔥 Streak — PLACEHOLDER (not in backend contract). Isolated for future endpoint. */
export function StreakBadge() {
  const streak = useGamification((s) => s.streak);
  return (
    <div
      className="flex items-center gap-1.5 rounded-full bg-[#FFF7ED] px-3 py-1.5 font-extrabold text-[#EA580C]"
      title="Серия дней (демо)"
    >
      <Flame className="size-5" aria-hidden />
      <span>{streak}</span>
    </div>
  );
}

/** 🪙 Coins — PLACEHOLDER currency for the future Shop. */
export function CoinBalance({ onClick }: { onClick?: () => void }) {
  const coins = useGamification((s) => s.coins);
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-full bg-[#FEF9C3] px-3 py-1.5 font-extrabold text-[#A16207] transition hover:brightness-95"
      title="Монеты (демо)"
    >
      <Coins className="size-5" aria-hidden />
      <span>{coins}</span>
    </button>
  );
}

/** 🧠 Mastery — REAL backend metric. */
export function MasteryBadge({
  mastery,
  animated = true,
}: {
  /** 0..1 */
  mastery: number | null | undefined;
  animated?: boolean;
}) {
  const pct = mastery == null ? null : Math.round(Math.max(0, Math.min(1, mastery)) * 100);
  const content = (
    <div
      className="flex items-center gap-1.5 rounded-full bg-primary-light px-3 py-1.5 font-extrabold text-primary"
      title="Среднее мастерство"
    >
      <Brain className="size-5" aria-hidden />
      <span>{pct === null ? "—" : `${pct}%`}</span>
    </div>
  );
  if (!animated) return content;
  return (
    <motion.div key={pct} initial={{ scale: 0.92 }} animate={{ scale: 1 }}>
      {content}
    </motion.div>
  );
}
