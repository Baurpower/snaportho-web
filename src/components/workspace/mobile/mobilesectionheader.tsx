"use client";

import React from "react";

export interface MobileSectionHeaderProps {
  /** Small uppercase label above the title (e.g. "SCHEDULE") */
  eyebrow?: string;
  /** Main title (e.g. "This week" or "Rotations") */
  title: string;
  /** Supporting text under the title */
  description?: string;
  /** Optional icon element (will be placed in a rounded square) */
  icon?: React.ReactNode;
  /** Optional action node (button, toggle, etc.) aligned to the right on larger viewports */
  action?: React.ReactNode;
  className?: string;
}

/**
 * Consistent full-width section header for mobile workspace screens.
 * Matches the visual language used in the desktop workspace home (eyebrow + title + subtitle + actions).
 * Use inside mobile views for Program Call, Weekly Schedule, and Coverage sections.
 */
export function MobileSectionHeader({
  eyebrow,
  title,
  description,
  icon,
  action,
  className = "",
}: MobileSectionHeaderProps) {
  return (
    <div className={`w-full ${className}`}>
      {eyebrow && (
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 mb-1.5">
          {eyebrow}
        </p>
      )}

      <div className="flex items-start gap-3">
        {icon ? (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-700 ring-1 ring-sky-100">
            {icon}
          </div>
        ) : null}

        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold tracking-tight text-slate-950">
            {title}
          </h2>
          {description && (
            <p className="mt-1 text-sm text-slate-500">{description}</p>
          )}
        </div>

        {action && <div className="shrink-0 ml-2">{action}</div>}
      </div>
    </div>
  );
}
