"use client";

import { useCallback } from "react";
import { getDictionary, type Dictionary } from "./dictionaries";
import { useLanguage } from "../stores/language";

export function useT(): { t: Dictionary; lang: string; setLang: (l: Dictionary extends never ? never : "ru" | "en" | "kk") => void } {
  const ui = useLanguage((s) => s.ui);
  const setUi = useLanguage((s) => s.setUi);
  const t = getDictionary(ui);
  const setLang = useCallback((l: "ru" | "en" | "kk") => setUi(l), [setUi]);
  return { t, lang: ui, setLang };
}
