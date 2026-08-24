"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { tokenStore } from "@/lib/api/client";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    if (!tokenStore.access) {
      router.replace("/login");
      return;
    }
    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3002/v1"}/auth/me`, {
      headers: { Authorization: `Bearer ${tokenStore.access}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((me: { role?: string } | null) => {
        if (!me?.role) {
          tokenStore.clear();
          router.replace("/login");
        } else {
          router.replace(me.role === "TEACHER" ? "/teacher" : "/home");
        }
      })
      .catch(() => {
        tokenStore.clear();
        router.replace("/login");
      });
  }, [router]);

  return (
    <div className="grid min-h-dvh place-items-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <span className="grid size-16 animate-pulse place-items-center rounded-xl bg-primary text-3xl font-black text-white shadow-pop">
          Z
        </span>
        <p className="text-sm font-semibold text-text-3">ZERTTE</p>
      </div>
    </div>
  );
}
