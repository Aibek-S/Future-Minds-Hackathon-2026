"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { tokenStore } from "@/lib/api/client";
import { useMe } from "@/lib/hooks/use-auth";
import { TeacherSidebar } from "@/components/layout/nav";

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const qc = useQueryClient();
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
      <TeacherSidebar />
      <div className="lg:pl-60">
        <main className="mx-auto max-w-7xl px-4 pb-16 pt-8">{children}</main>
      </div>
    </div>
  );
}
