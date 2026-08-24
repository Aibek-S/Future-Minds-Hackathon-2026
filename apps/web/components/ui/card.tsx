import { clsx } from "clsx";
import type { HTMLAttributes, ReactNode } from "react";

export function Card({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx("rounded-lg border border-border bg-surface shadow-card", className)}
      {...rest}
    >
      {children}
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "primary" | "success" | "warning" | "error" | "info";
  className?: string;
}) {
  const tones = {
    neutral: "bg-surface-2 text-text-2",
    primary: "bg-primary-light text-primary",
    success: "bg-[#D1FAE5] text-[#047857]",
    warning: "bg-[#FEF3C7] text-[#B45309]",
    error: "bg-[#FEE2E2] text-[#B91C1C]",
    info: "bg-[#E0F2FE] text-[#0369A1]",
  } as const;
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
