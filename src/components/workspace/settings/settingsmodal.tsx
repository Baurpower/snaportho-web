"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export default function SettingsModal({
  open,
  children,
  onBackdropClick,
}: {
  open: boolean;
  children: ReactNode;
  onBackdropClick?: () => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open || typeof document === "undefined") return;

    const body = document.body;
    const previousOverflow = body.style.overflow;
    const previousPaddingRight = body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPaddingRight;
    };
  }, [open]);

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[140] isolate">
      <button
        type="button"
        aria-label="Close modal"
        onClick={onBackdropClick}
        className="absolute inset-0 h-full w-full bg-slate-950/80 backdrop-blur-sm"
      />
      <div className="relative flex min-h-full items-center justify-center overflow-y-auto p-4 sm:p-6">
        {children}
      </div>
    </div>,
    document.body
  );
}
