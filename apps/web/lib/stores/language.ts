"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { UiLanguage } from "../types";

interface LanguageState {
  ui: UiLanguage;
  setUi: (lang: UiLanguage) => void;
}

export const useLanguage = create<LanguageState>()(
  persist(
    (set) => ({
      ui: "ru",
      setUi: (ui) => {
        document.cookie = `zertte.lang=${ui}; path=/; max-age=31536000`;
        set({ ui });
      },
    }),
    { name: "zertte.language" },
  ),
);
