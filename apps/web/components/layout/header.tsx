"use client";

import { useQuery } from "@tanstack/react-query";
import { Languages, LogOut, Menu, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { studentsService } from "@/lib/services/students";
import { useMe, useLogout } from "@/lib/hooks/use-auth";
import { useT } from "@/lib/i18n/use-t";
import { LANGUAGES } from "@/lib/i18n/dictionaries";
import type { UiLanguage } from "@/lib/types";
import { CoinBalance, MasteryBadge, StreakBadge } from "@/components/gamification/badges";

export function AppHeader({ onMenu }: { onMenu?: () => void }) {
  const { t, lang, setLang } = useT();
  const me = useMe();
  const logout = useLogout();
  const [langOpen, setLangOpen] = useState(false);
  const studentId = me.data?.student?.id;

  const subjects = useQuery({
    queryKey: ["subjects", studentId],
    queryFn: () => studentsService.subjects(studentId!),
    enabled: !!studentId,
  });

  // Overall mastery = average of subject avgMastery (real data).
  const list = subjects.data ?? [];
  const overall =
    list.length > 0 ? list.reduce((acc, s) => acc + (s.avgMastery ?? 0), 0) / list.length : null;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
        <button
          className="grid size-10 place-items-center rounded-md text-text-2 hover:bg-surface-2 lg:hidden"
          onClick={onMenu}
          aria-label="Меню"
        >
          <Menu className="size-5" />
        </button>

        <Link href="/home" className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-md bg-primary text-lg font-black text-white shadow-[0_4px_14px_rgba(124,58,237,0.35)]">
            Z
          </span>
          <span className="hidden text-lg font-black tracking-tight text-primary sm:block">ZERTTE</span>
        </Link>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <StreakBadge />
          <CoinBalance onClick={() => (window.location.href = "/shop")} />
          <MasteryBadge mastery={overall} />

          {/* Language */}
          <div className="relative">
            <button
              onClick={() => setLangOpen((v) => !v)}
              aria-expanded={langOpen}
              aria-haspopup="listbox"
              className="flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-1.5 text-sm font-semibold text-text-2 hover:border-primary-light"
            >
              <Languages className="size-4" />
              <span className="uppercase">{lang}</span>
            </button>
            {langOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setLangOpen(false)} />
                <div
                  role="listbox"
                  className="absolute right-0 top-11 z-20 w-40 overflow-hidden rounded-md border border-border bg-surface shadow-pop"
                >
                  {LANGUAGES.map((l) => (
                    <button
                      key={l.code}
                      role="option"
                      aria-selected={l.code === lang}
                      onClick={() => {
                        setLang(l.code as UiLanguage);
                        setLangOpen(false);
                      }}
                      className={`flex w-full items-center gap-2 px-3 py-2.5 text-sm font-medium transition hover:bg-primary-subtle ${
                        l.code === lang ? "bg-primary-subtle text-primary" : ""
                      }`}
                    >
                      <span>{l.flag}</span> {l.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Avatar */}
          <div className="group relative">
            <button
              className="grid size-10 place-items-center rounded-full bg-gradient-to-br from-primary to-[#6366F1] text-sm font-extrabold text-white"
              aria-label="Профиль"
              onClick={() => (window.location.href = "/profile")}
            >
              {(me.data?.name ?? "Я").slice(0, 1).toUpperCase()}
            </button>
            <div className="absolute right-0 top-12 hidden w-44 overflow-hidden rounded-md border border-border bg-surface shadow-pop group-hover:block group-focus-within:block">
              <Link
                href="/profile"
                className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium hover:bg-primary-subtle"
              >
                <Sparkles className="size-4 text-primary" /> {t.nav.profile}
              </Link>
              <button
                onClick={logout}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-sm font-medium text-error hover:bg-[#FEF2F2]"
              >
                <LogOut className="size-4" /> {t.common.logout}
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
