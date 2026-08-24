"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * PLACEHOLDER gamification store.
 * Streak/coins are NOT part of the backend contract (docs §15).
 * Everything here is local-only and flagged `isPlaceholder` so a future
 * gamification endpoint replaces this single file.
 */
interface GamificationState {
  isPlaceholder: true;
  streak: number;
  coins: number;
  lastActiveDate: string | null;
  bumpDailyStreak: () => void;
  addCoins: (amount: number) => void;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export const useGamification = create<GamificationState>()(
  persist(
    (set, get) => ({
      isPlaceholder: true,
      streak: 0,
      coins: 120,
      lastActiveDate: null,
      bumpDailyStreak: () => {
        const t = today();
        const { lastActiveDate, streak } = get();
        if (lastActiveDate === t) return;
        const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
        set({
          streak: lastActiveDate === yesterday ? streak + 1 : 1,
          lastActiveDate: t,
          coins: get().coins + 5,
        });
      },
      addCoins: (amount) => set({ coins: Math.max(0, get().coins + amount) }),
    }),
    { name: "zertte.gamification" },
  ),
);
