"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { tokenStore } from "@/lib/api/client";
import { authService } from "@/lib/services/auth";
import type { MeResponse } from "@/lib/types";

export function useMe(options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? tokenStore.access !== null;
  return useQuery({
    queryKey: ["me"],
    queryFn: () => authService.me(),
    retry: false,
    staleTime: 60_000,
    enabled,
  });
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authService.login(email, password),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["me"] }),
  });
}

export function useRegister() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Parameters<typeof authService.register>[0]) =>
      authService.register(payload),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["me"] }),
  });
}

export function useLogout() {
  const qc = useQueryClient();
  const router = useRouter();
  return useCallback(() => {
    authService.logout();
    qc.clear();
    router.replace("/login");
  }, [qc, router]);
}

/** Home route by role. */
export function homeFor(me?: MeResponse | null): string {
  if (!me) return "/login";
  return me.role === "TEACHER" ? "/teacher" : "/home";
}
