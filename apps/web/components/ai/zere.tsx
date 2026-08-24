"use client";

import { motion } from "framer-motion";

export type ZereMood = "happy" | "thinking" | "celebrating";

/**
 * ZERE — female AI tutor mascot of ZERTTE.
 * Pure inline SVG (no external assets): purple hair buns, friendly face,
 * ZERTTE hoodie. Scales to any size; mood switches face.
 */
export function ZereAvatar({
  size = 96,
  mood = "happy",
  float = false,
  className = "",
}: {
  size?: number;
  mood?: ZereMood;
  float?: boolean;
  className?: string;
}) {
  const body = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      role="img"
      aria-label="Зере — ИИ-наставник"
      className={className}
    >
      {/* back hair */}
      <circle cx="60" cy="52" r="34" fill="#5B21B6" />
      {/* side buns */}
      <circle cx="24" cy="46" r="12" fill="#7C3AED" />
      <circle cx="96" cy="46" r="12" fill="#7C3AED" />
      <circle cx="24" cy="44" r="5" fill="#A78BFA" opacity="0.8" />
      <circle cx="96" cy="44" r="5" fill="#A78BFA" opacity="0.8" />

      {/* shoulders / hoodie */}
      <path d="M22 108c4-18 19-26 38-26s34 8 38 26v6H22v-6z" fill="#7C3AED" />
      <path d="M50 84c3 6 17 6 20 0l-2-4H52l-2 4z" fill="#EDE9FE" />
      {/* zipper */}
      <rect x="58.6" y="88" width="2.8" height="16" rx="1.4" fill="#C4B5FD" />

      {/* face */}
      <circle cx="60" cy="56" r="26" fill="#FFD9BE" />
      {/* bangs */}
      <path d="M36 48c0-14 11-22 24-22s24 8 24 22c-6-6-13-9-24-9s-18 3-24 9z" fill="#6D28D9" />
      <path d="M84 40c4 3 6 8 6 12-4-4-9-6-14-7 3-2 6-3 8-5z" fill="#6D28D9" />

      {/* eyes */}
      {mood === "celebrating" ? (
        <>
          <path d="M45 55c2-3 6-3 8 0" stroke="#1E293B" strokeWidth="3" strokeLinecap="round" />
          <path d="M67 55c2-3 6-3 8 0" stroke="#1E293B" strokeWidth="3" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="49" cy="56" r="3.4" fill="#1E293B" />
          <circle cx="71" cy="56" r="3.4" fill="#1E293B" />
          <circle cx="50.2" cy="54.8" r="1.1" fill="#fff" />
          <circle cx="72.2" cy="54.8" r="1.1" fill="#fff" />
        </>
      )}

      {/* brows */}
      {mood === "thinking" ? (
        <path d="M64 47c3-2 7-2 10 0" stroke="#4C1D95" strokeWidth="2.4" strokeLinecap="round" />
      ) : (
        <path d="M45 47c2-2 6-2 8 0M67 47c2-2 6-2 8 0" stroke="#4C1D95" strokeWidth="2.4" strokeLinecap="round" />
      )}

      {/* blush */}
      <circle cx="43" cy="63" r="4" fill="#FCA5A5" opacity="0.55" />
      <circle cx="77" cy="63" r="4" fill="#FCA5A5" opacity="0.55" />

      {/* mouth */}
      {mood === "thinking" ? (
        <circle cx="60" cy="68" r="3" fill="#BE185D" />
      ) : mood === "celebrating" ? (
        <path d="M52 66c3 6 13 6 16 0-4 2-12 2-16 0z" fill="#BE185D" />
      ) : (
        <path d="M53 66c2 3 12 3 14 0" stroke="#BE185D" strokeWidth="2.6" strokeLinecap="round" />
      )}

      {/* headband with Z */}
      <rect x="42" y="30" width="36" height="9" rx="4.5" fill="#fff" />
      <text x="60" y="37.4" textAnchor="middle" fontSize="8" fontWeight="900" fill="#7C3AED">
        Z
      </text>

      {/* sparkles */}
      <path d="M104 62l1.6 3.6L109 67l-3.4 1.4L104 72l-1.6-3.6L99 67l3.4-1.4L104 62z" fill="#F59E0B" />
      <circle cx="14" cy="70" r="2.4" fill="#0EA5E9" />
    </svg>
  );

  if (!float) return body;
  return (
    <motion.div animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 3.2, ease: "easeInOut" }}>
      {body}
    </motion.div>
  );
}

/** Name plate used next to the mascot. */
export function ZereNamePlate({ subtitle }: { subtitle?: string }) {
  return (
    <div className="flex items-center gap-2">
      <h1 className="text-3xl font-black tracking-tight">Zere</h1>
      <span className="rounded-full bg-primary-light px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-primary">
        ИИ
      </span>
      {subtitle && <span className="text-sm font-semibold text-text-2">{subtitle}</span>}
    </div>
  );
}
