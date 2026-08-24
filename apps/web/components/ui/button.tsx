"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { clsx } from "clsx";
import { Loader2 } from "lucide-react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success" | "outline";
type Size = "sm" | "md" | "lg" | "xl";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-primary text-white shadow-[0_4px_14px_rgba(124,58,237,0.35)] hover:bg-primary-hover active:translate-y-px",
  secondary: "bg-primary-light text-primary hover:bg-[#e0d9fb] active:translate-y-px",
  ghost: "text-text-2 hover:bg-surface-2 hover:text-text",
  danger: "bg-error text-white hover:brightness-95 active:translate-y-px",
  success: "bg-success text-white hover:brightness-95 active:translate-y-px",
  outline: "border-2 border-border bg-surface text-text hover:border-primary-light hover:text-primary",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] rounded-sm gap-1.5",
  md: "h-10 px-4 text-sm rounded-md gap-2",
  lg: "h-12 px-6 text-[15px] rounded-md gap-2",
  xl: "h-14 px-8 text-base font-bold rounded-xl gap-2 uppercase tracking-wide",
};

/** Bottom action bar button (Duolingo-style chunky). */
const CHUNKY =
  "border-b-4 active:border-b-0 active:translate-y-1 border-black/15 select-none";

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", loading, fullWidth, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={clsx(
        "inline-flex items-center justify-center font-semibold transition-all duration-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-50",
        sizes[size],
        variants[variant],
        (variant === "primary" || variant === "danger" || variant === "success") && CHUNKY,
        fullWidth && "w-full",
        className,
      )}
      {...rest}
    >
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
});
