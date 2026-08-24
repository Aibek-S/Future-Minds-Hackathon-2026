import { clsx } from "clsx";
import type { ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("animate-pulse rounded-md bg-surface-2", className)} />;
}

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={clsx("rounded-lg border border-border bg-surface p-5 shadow-card", className)}>
      <div className="flex items-center gap-4">
        <Skeleton className="size-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      <Skeleton className="mt-4 h-3 w-full" />
      <Skeleton className="mt-2 h-3 w-5/6" />
    </div>
  );
}

export function TreeSkeleton() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-6 py-8">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className={clsx("flex gap-16", i % 2 ? "translate-x-10" : "-translate-x-6")}>
          <Skeleton className="size-[72px] rounded-2xl" />
          <Skeleton className="size-[72px] rounded-2xl" />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-md border border-border bg-surface p-3">
          <Skeleton className="size-9 rounded-full" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="hidden h-4 w-20 sm:block" />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  emoji = "🌱",
  title,
  body,
  action,
}: {
  emoji?: string;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface px-6 py-14 text-center">
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 18 }}
        className="text-5xl"
      >
        {emoji}
      </motion.div>
      <h3 className="mt-4 text-lg font-bold">{title}</h3>
      {body && <p className="mt-1 max-w-sm text-sm text-text-2">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = "Что-то пошло не так",
  body = "Не удалось загрузить данные. Попробуйте ещё раз.",
  onRetry,
}: {
  title?: string;
  body?: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center rounded-lg bg-[#FEF2F2] px-6 py-12 text-center"
    >
      <div className="grid size-14 place-items-center rounded-full bg-error/10 text-error">
        <AlertTriangle className="size-7" />
      </div>
      <h3 className="mt-4 text-lg font-bold text-text">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-text-2">{body}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-5 inline-flex items-center gap-2 rounded-md bg-error px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-95"
        >
          <RefreshCw className="size-4" /> Повторить
        </button>
      )}
    </div>
  );
}
