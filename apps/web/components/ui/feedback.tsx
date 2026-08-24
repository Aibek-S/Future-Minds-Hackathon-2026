"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";

/** Lightweight confetti burst (no external dep) for major success moments. */
export function Confetti({ fire }: { fire: boolean }) {
  const COLORS = ["#7C3AED", "#A78BFA", "#10B981", "#F59E0B", "#0EA5E9", "#EC4899"];
  return (
    <AnimatePresence>
      {fire && (
        <div className="pointer-events-none fixed inset-0 z-[70] overflow-hidden" aria-hidden>
          {Array.from({ length: 42 }).map((_, i) => {
            const left = Math.random() * 100;
            const delay = Math.random() * 0.35;
            const duration = 1.6 + Math.random() * 1.2;
            const size = 8 + Math.random() * 8;
            const rotate = Math.random() * 360;
            const color = COLORS[i % COLORS.length];
            const round = i % 3 === 0;
            return (
              <motion.span
                key={`${i}-${fire}`}
                className="absolute top-[-24px]"
                style={{
                  left: `${left}%`,
                  width: size,
                  height: round ? size : size * 0.5,
                  background: color,
                  borderRadius: round ? "50%" : 2,
                  rotate: `${rotate}deg`,
                }}
                initial={{ y: -30, opacity: 1 }}
                animate={{ y: "105vh", opacity: [1, 1, 0.9, 0] }}
                exit={{ opacity: 0 }}
                transition={{ duration, delay, ease: "easeIn" }}
              />
            );
          })}
        </div>
      )}
    </AnimatePresence>
  );
}

/** Auto-hide toast stack. */
export function Toast({
  message,
  tone = "info",
  onDone,
}: {
  message: string | null;
  tone?: "info" | "success" | "error";
  onDone?: () => void;
}) {
  useEffect(() => {
    if (!message) return;
    const id = setTimeout(() => onDone?.(), 4200);
    return () => clearTimeout(id);
  }, [message, onDone]);

  const tones = {
    info: "bg-text text-white",
    success: "bg-success text-white",
    error: "bg-error text-white",
  } as const;

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          role="status"
          className={tones[tone]}
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 26 }}
        >
          <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[80] flex justify-center px-4 md:bottom-8">
            <div className="rounded-md px-4 py-2.5 text-sm font-medium shadow-pop">{message}</div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
