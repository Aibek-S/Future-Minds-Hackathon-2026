"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { UiLanguage } from "@/lib/types";
import { useLanguage } from "@/lib/stores/language";

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 15_000 },
        },
      }),
  );

  // Hydrate language from cookie before paint effects (zustand persist handles storage).
  const setUi = useLanguage((s) => s.setUi);
  const ui = useLanguage((s) => s.ui);
  useEffect(() => {
    const match = document.cookie.match(/zertte\.lang=(ru|en|kk)/);
    if (match && match[1] !== ui) setUi(match[1] as UiLanguage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
