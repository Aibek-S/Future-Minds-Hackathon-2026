"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { tokenStore } from "@/lib/api/client";
import { authService, useMe } from "@/lib/hooks/use-auth";

/**
 * Auth gate without hydration mismatches:
 * Phase 1 (SSR + first client paint): render children EXACTLY like the server.
 * Phase 2 (after mount): check localStorage/token, fetch /auth/me, redirect if needed.
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const qc = useQueryClient();
  const [mounted, setMounted] = useState(false);

  // Never auto-run during render; we control it explicitly after mount.
  const me = useMe({ enabled: false });

  useEffect(() => {
    setMounted(true);

    if (!tokenStore.access) {
      router.replace("/login");
      return;
    }

    void qc
      .fetchQuery({ queryKey: ["me"], queryFn: () => authService.me() })
      .catch(() => {
        tokenStore.clear();
        void qc.clear();
        router.replace("/login");
      });
  }, [router, qc]);

  useEffect(() => {
    if (mounted && me.isError) {
      tokenStore.clear();
      void qc.clear();
      router.replace("/login");
    }
  }, [mounted, me.isError, router, qc]);

  // Phase 1: identical markup on server & first client render.
  if (!mounted) return <>{children}</>;

  const hasToken = tokenStore.access !== null;

  // Phase 2: safe post-hydration states.
  if (!hasToken || me.isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="size-10 animate-spin rounded-full border-4 border-primary-light border-t-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
