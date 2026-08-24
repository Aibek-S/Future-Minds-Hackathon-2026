"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Tracks which taskIds the student has already attempted (locally).
 * Used to prioritise FRESH tasks in lessons: the backend EMA rewards
 * first attempts (×1.0) and decays repeats (×0.5 / ×0.1).
 */
interface AttemptedState {
  /** taskId -> ISO date */
  items: Record<string, string>;
  markAttempted: (taskId: string) => void;
}

export const useAttemptedTasks = create<AttemptedState>()(
  persist(
    (set) => ({
      items: {},
      markAttempted: (taskId) =>
        set((s) => ({ items: { ...s.items, [taskId]: new Date().toISOString() } })),
    }),
    { name: "zertte.attempted-tasks" },
  ),
);

export function isFresh(items: Record<string, string>, taskId: string): boolean {
  return !(taskId in items);
}
