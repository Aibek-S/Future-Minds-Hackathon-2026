"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Menu, Search } from "lucide-react";
import { tokenStore } from "@/lib/api/client";
import { useMe } from "@/lib/hooks/use-auth";
import { TeacherSidebar } from "@/components/layout/nav";
import { SearchBar } from "@/components/ui/search-bar";

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const qc = useQueryClient();
  const [menuOpen, setMenuOpen] = useState(false);
  const hasToken = typeof window !== "undefined" && tokenStore.access !== null;
  const me = useMe();

  useEffect(() => {
    if (!hasToken) {
      router.replace("/login");
      return;
    }
    if (me.isError) {
      tokenStore.clear();
      void qc.clear();
      router.replace("/login");
      return;
    }
    // Students are not allowed in the teacher area.
    if (me.data && me.data.role !== "TEACHER") router.replace("/home");
  }, [hasToken, me.isError, me.data, router, qc]);

  return (
    <div className="min-h-dvh bg-surface-2/60">
      <TeacherSidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      {/* Mobile top bar with hamburger (desktop uses the fixed sidebar) */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-surface/95 px-4 backdrop-blur lg:hidden">
        <button
          onClick={() => setMenuOpen(true)}
          aria-label="Открыть меню"
          className="grid size-10 place-items-center rounded-md text-text-2 transition hover:bg-surface-2"
        >
          <Menu className="size-5" />
        </button>
        <div className="flex-1">
          <SearchBar placeholder="Поиск материалов..." />
        </div>
        <span className="text-base font-black">ZERTTE</span>
        <span className="rounded-full bg-primary-light px-2 py-0.5 text-[11px] font-bold text-primary">Учитель</span>
      </header>
      <div className="lg:pl-60">
        <main className="mx-auto max-w-7xl px-4 pb-16 pt-6 lg:pt-8">{children}</main>
      </div>
    </div>
  );
}
