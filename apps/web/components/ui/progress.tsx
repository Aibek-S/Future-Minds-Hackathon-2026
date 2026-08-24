"use client";

import { motion } from "framer-motion";
import { clsx } from "clsx";

/** Neutral progress bar (0..1). */
export function ProgressBar({
  value,
  className,
  barClassName,
  height = 12,
}: {
  value: number;
  className?: string;
  barClassName?: string;
  height?: number;
}) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={clsx("w-full overflow-hidden rounded-full bg-surface-2", className)}
      style={{ height }}
    >
      <motion.div
        className={clsx("h-full rounded-full bg-primary", barClassName)}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ type: "spring", stiffness: 120, damping: 20 }}
      />
    </div>
  );
}

/** Mastery bar — the core learning metric visualization (real backend data). */
export function MasteryBar({
  mastery,
  color = "#7C3AED",
  showLabel = true,
  size = "md",
}: {
  /** 0..1 as returned by backend */
  mastery: number;
  color?: string;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const pct = Math.max(0, Math.min(1, mastery)) * 100;
  const h = { sm: 8, md: 12, lg: 16 }[size];
  const label = `${Math.round(pct)}%`;
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-full overflow-hidden rounded-full bg-surface-2"
        style={{ height: h }}
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Mastery ${label}`}
      >
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
        />
      </div>
      {showLabel && (
        <span className="min-w-[38px] text-right text-xs font-bold text-text-2">{label}</span>
      )}
    </div>
  );
}

/** Big animated percentage counter (mastery before → after etc.). */
export function AnimatedPercent({ value, className }: { value: number; className?: string }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <span className={className}>
      <motion.span
        key={pct}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {pct}%
      </motion.span>
    </span>
  );
}
