"use client";

import React from "react";

export interface MobileCardShellProps {
  children: React.ReactNode;
  className?: string;
  /** Optional top accent bar (e.g. "bg-sky-500" or a tone class) */
  accentClassName?: string;
  /** Makes the whole card clickable (adds hover/active feedback) */
  onClick?: () => void;
  /** Optional role for accessibility when clickable */
  role?: string;
}

/**
 * Reusable full-width mobile card primitive.
 * - Rounded, white background, subtle shadow + border.
 * - Optional colored top accent bar (perfect for rotation/call categories).
 * - Safe for lists on small screens (w-full, no min-w constraints).
 * - Purely presentational. Desktop grids can continue using their own card markup.
 */
export function MobileCardShell({
  children,
  className = "",
  accentClassName,
  onClick,
  role,
}: MobileCardShellProps) {
  const isInteractive = !!onClick;

  return (
    <div
      onClick={onClick}
      role={isInteractive ? role || "button" : role}
      tabIndex={isInteractive ? 0 : undefined}
      className={[
        "w-full rounded-2xl border border-slate-200 bg-white shadow-sm",
        "overflow-hidden transition",
        isInteractive
          ? "cursor-pointer active:scale-[0.985] hover:border-slate-300 hover:shadow-md"
          : "",
        className,
      ].join(" ")}
    >
      {accentClassName ? (
        <div className={`h-1.5 ${accentClassName}`} aria-hidden="true" />
      ) : null}

      <div className="p-4">{children}</div>
    </div>
  );
}
