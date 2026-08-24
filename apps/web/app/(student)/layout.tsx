"use client";

import { useState } from "react";
import { AppHeader } from "@/components/layout/header";
import { StudentBottomNav, StudentSidebar } from "@/components/layout/nav";
import { RequireAuth } from "@/components/system/require-auth";

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <RequireAuth>
      <div className="min-h-dvh">
        <StudentSidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
        <div className="lg:pl-64">
          <AppHeader onMenu={() => setMenuOpen(true)} />
          <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 lg:pb-12">{children}</main>
        </div>
        <StudentBottomNav />
      </div>
    </RequireAuth>
  );
}
