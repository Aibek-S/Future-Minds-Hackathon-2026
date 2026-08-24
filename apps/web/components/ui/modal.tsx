"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { clsx } from "clsx";

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            className={clsx(
              "scroll-thin max-h-[92dvh] w-full overflow-y-auto rounded-t-xl border border-border bg-surface shadow-pop sm:rounded-xl",
              wide ? "sm:max-w-2xl" : "sm:max-w-md",
            )}
            initial={{ y: 60, scale: 0.98, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 40, scale: 0.98, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
          >
            {(title || true) && (
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface/95 px-5 py-4 backdrop-blur">
                <h3 className="text-lg font-bold">{title}</h3>
                <button
                  onClick={onClose}
                  aria-label="Close"
                  className="rounded-md p-1.5 text-text-3 transition hover:bg-surface-2 hover:text-text"
                >
                  <X className="size-5" />
                </button>
              </div>
            )}
            <div className="p-5">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
