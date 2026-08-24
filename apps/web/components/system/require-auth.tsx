"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { tokenStore } from "@/lib/api/client";
import { useMe } from "@/lib/hooks/use-auth";

/** Redirects unauthenticated users to /login once /auth/me resolves. */
export function RequireAuth({ children }: { children: React.ReactNode }) {
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
    }
  }, [hasToken, me.isError, router, qc]);

  if (me.isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="size-10 animate-spin rounded-full border-4 border-primary-light border-t-primary" />
      </div>
    );
  }
  return <>{children}</>;
}
