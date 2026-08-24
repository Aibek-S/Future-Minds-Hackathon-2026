"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { UiLanguage } from "../types";

export interface OnboardingDraft {
  language: UiLanguage | null;
  grade: number | null;
  subjectIds: string[];
  goalTarget: string;
  goalDeadline: string;
  step: number;
  set: (patch: Partial<Omit<OnboardingDraft, "set" | "reset">>) => void;
  reset: () => void;
}

export const useOnboarding = create<OnboardingDraft>()(
  persist(
    (set) => ({
      language: null,
      grade: null,
      subjectIds: [],
      goalTarget: "",
      goalDeadline: "",
      step: 0,
      set: (patch) => set(patch),
      reset: () =>
        set({ language: null, grade: null, subjectIds: [], goalTarget: "", goalDeadline: "", step: 0 }),
    }),
    { name: "zertte.onboarding" },
  ),
);
