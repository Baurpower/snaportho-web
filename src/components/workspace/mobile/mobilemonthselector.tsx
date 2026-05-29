"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface MobileMonthOption {
  key: string;
  label: string;
}

export interface MobileMonthSelectorProps {
  /** Human label for the currently active month (e.g. "March 2025") */
  activeLabel: string;
  onPrevious: () => void;
  onNext: () => void;
  /** Disable the previous button */
  disablePrevious?: boolean;
  /** Disable the next button */
  disableNext?: boolean;

  /** Optional list of months to show as horizontal scrollable pills */
  months?: MobileMonthOption[];
  /** Currently selected key (must match one of the months keys) */
  selectedKey?: string;
  onSelect?: (key: string) => void;

  /** Optional subtitle under the main label (e.g. date range) */
  subtitle?: string;

  /** Use a more compact layout (smaller chevrons + label) */
  compact?: boolean;

  className?: string;
}

/**
 * Reusable mobile-first month navigation control.
 * - Large touch-friendly chevron buttons
 * - Optional horizontal snap-scrolling pill row for quick month jumping
 * - Completely presentation-only — parent owns all data and handlers
 * - Safe to use in Program Call Calendar, Rotation Coverage, etc.
 */
export function MobileMonthSelector({
  activeLabel,
  onPrevious,
  onNext,
  disablePrevious = false,
  disableNext = false,
  months,
  selectedKey,
  onSelect,
  subtitle,
  compact = false,
  className = "",
}: MobileMonthSelectorProps) {
  const showPills = months && months.length > 0 && onSelect;

  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onPrevious}
          disabled={disablePrevious}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 active:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Previous month"
        >
          <ChevronLeft className={compact ? "h-4 w-4" : "h-5 w-5"} />
        </button>

        <div className="min-w-0 text-center px-2">
          <p
            className={
              compact
                ? "text-base font-bold tracking-tight text-slate-950"
                : "text-xl font-bold tracking-tight text-slate-950"
            }
          >
            {activeLabel}
          </p>
          {subtitle && (
            <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
          )}
        </div>

        <button
          type="button"
          onClick={onNext}
          disabled={disableNext}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 active:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Next month"
        >
          <ChevronRight className={compact ? "h-4 w-4" : "h-5 w-5"} />
        </button>
      </div>

      {showPills && (
        <div className="mt-3 -mx-1 overflow-x-auto pb-1 snap-x snap-mandatory scrollbar-none">
          <div className="flex gap-2 px-1 min-w-max">
            {months!.map((month) => {
              const isActive = month.key === selectedKey;
              return (
                <button
                  key={month.key}
                  type="button"
                  onClick={() => onSelect!(month.key)}
                  className={[
                    "snap-start whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition min-h-[40px] min-w-[64px]",
                    isActive
                      ? "bg-slate-950 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 active:bg-slate-300",
                  ].join(" ")}
                  aria-current={isActive ? "page" : undefined}
                >
                  {month.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
