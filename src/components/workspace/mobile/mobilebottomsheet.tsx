"use client";

import React, { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

export interface MobileBottomSheetProps {
  open: boolean;
  onClose: () => void;
  /** Main title shown in the sheet header */
  title?: string;
  /** Optional smaller description under the title */
  description?: string;
  children: React.ReactNode;
  /** Optional sticky footer area (e.g. action buttons) */
  footer?: React.ReactNode;
  /** Additional classes for the sheet panel */
  className?: string;
}

/**
 * Generic, reusable bottom sheet for mobile workspace interactions.
 * - Slides up from bottom with backdrop
 * - Safe-area aware (respects iOS home indicator)
 * - Handles Escape, backdrop click, close button, and body scroll lock
 * - High z-index consistent with existing workspace drawers/modals
 * - Intended for future mobile day details, call editors, quick actions, etc.
 * - Controlled component — parent manages open state.
 */
export function MobileBottomSheet({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className = "",
}: MobileBottomSheetProps) {
  // Body scroll lock + Escape key (only while open)
  useEffect(() => {
    if (!open) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-[200] bg-slate-950/45 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Bottom sheet panel */}
          <motion.div
            className={[
              "fixed bottom-0 left-0 right-0 z-[210] flex flex-col",
              "bg-white border-t border-slate-200 rounded-t-3xl shadow-2xl",
              "max-h-[92dvh] overflow-hidden",
              className,
            ].join(" ")}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? "mobile-sheet-title" : undefined}
          >
            {/* Header */}
            <div className="shrink-0 border-b border-slate-200 px-4 py-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                {title && (
                  <h2
                    id="mobile-sheet-title"
                    className="text-xl font-bold tracking-tight text-slate-950"
                  >
                    {title}
                  </h2>
                )}
                {description && (
                  <p className="mt-1 text-sm text-slate-500">{description}</p>
                )}
              </div>

              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto min-h-0 px-4 py-4">
              {children}
            </div>

            {/* Optional footer (safe-area aware) */}
            {footer && (
              <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 pb-[env(safe-area-inset-bottom)]">
                {footer}
              </div>
            )}

            {/* Extra safe-area padding when no footer */}
            {!footer && (
              <div className="h-[env(safe-area-inset-bottom)]" aria-hidden />
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
