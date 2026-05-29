"use client";

import React, { useMemo } from "react";
import { Users } from "lucide-react";
import { MobileCardShell } from "@/components/workspace/mobile/mobilecardshell";
import { MobileMonthSelector } from "@/components/workspace/mobile/mobilemonthselector";

type AheadMonth = {
  year: number;
  monthIndex: number;
  label: string;
};

type MonthlyCoverageResponse = {
  groups: Array<{
    rotationId: string;
    rotation: string;
    shortName: string | null;
    category: string | null;
    color: string | null;
    residents: Array<{
      membershipId: string;
      resident: string;
      level: string;
      service: string | null;
      startDate: string;
      endDate: string;
    }>;
  }>;
};

export interface MobileRotationCoverageProps {
  months: AheadMonth[];
  activeMonthIndex: number;
  setActiveMonthIndex: React.Dispatch<React.SetStateAction<number>>;
  coverageByMonth: Record<string, MonthlyCoverageResponse | null>;
  coverageLoading: boolean;
}

/**
 * Mobile-only Rotation Coverage section.
 * Reuses exactly the same data and state owned by the parent:
 * - aheadMonths, activeMonthIndex, setActiveMonthIndex
 * - coverageByMonth (already fetched by parent effect)
 * - coverageLoading
 *
 * Uses Phase 2 primitives for consistent mobile UX.
 * Single-column full-width cards.
 * MobileMonthSelector for navigation.
 * No new data fetching or coverage logic.
 */
export function MobileRotationCoverage({
  months,
  activeMonthIndex,
  setActiveMonthIndex,
  coverageByMonth,
  coverageLoading,
}: MobileRotationCoverageProps) {
  const activeMonth = months[activeMonthIndex] ?? null;
  const activeKey = activeMonth ? `${activeMonth.year}-${activeMonth.monthIndex}` : "";
  const coverage = activeKey ? coverageByMonth[activeKey] ?? null : null;

  const groupedRotations = useMemo(() => {
    if (!coverage) return [];
    return coverage.groups.map((group) => ({
      rotation: group.shortName ?? group.rotation,
      tone: normalizeColorToTone(group.color),
      residents: group.residents.map((r) => ({
        resident: r.resident,
        level: r.level,
      })),
    }));
  }, [coverage]);

  const handlePrev = () => setActiveMonthIndex((prev) => Math.max(prev - 1, 0));
  const handleNext = () =>
    setActiveMonthIndex((prev) => Math.min(prev + 1, months.length - 1));

  if (!activeMonth) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500">
        No months available.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Header with icon + title (mirrors desktop aesthetic but mobile-optimized) */}
      <div className="border-b border-slate-200 bg-gradient-to-b from-slate-50 to-white px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-50 text-sky-700 ring-1 ring-sky-100">
            <Users className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xl font-bold tracking-tight text-slate-950">Rotations</h3>
            <p className="text-sm text-slate-500">Quick monthly coverage</p>
          </div>
        </div>
      </div>

      {/* Mobile month navigation using Phase 2 primitive */}
      <div className="px-4 pt-4">
        <MobileMonthSelector
          activeLabel={activeMonth.label}
          onPrevious={handlePrev}
          onNext={handleNext}
          disablePrevious={activeMonthIndex === 0}
          disableNext={activeMonthIndex === months.length - 1}
          compact
        />
      </div>

      <div className="px-4 py-4">
        <div className="mb-3 flex items-center justify-between px-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Rotation Coverage
          </p>
          <p className="text-xs text-slate-500">
            {coverageLoading ? "Loading..." : `${groupedRotations.length} rotations`}
          </p>
        </div>

        {coverageLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
            Loading monthly coverage...
          </div>
        ) : groupedRotations.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
            No coverage found for this month.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {groupedRotations.map((group, idx) => (
              <MobileCardShell
                key={`${activeKey}-${group.rotation}-${idx}`}
                accentClassName={group.tone.replace(/text-\S+/g, "").replace(/border-\S+/g, "").trim()}
                contentClassName="p-3"
              >
                <div>
                  <h4 className="text-lg font-black tracking-[-0.02em] text-slate-950">
                    {group.rotation}
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    {group.residents.length} resident{group.residents.length === 1 ? "" : "s"}
                  </p>
                </div>

                <div className="mt-2 space-y-1">
                  {group.residents.map((res, rIdx) => (
                    <div
                      key={rIdx}
                      className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/80 px-2.5 py-1 text-xs"
                    >
                      <span className="truncate font-medium text-slate-900">{res.resident}</span>
                      <span className="ml-2 shrink-0 rounded-full bg-white px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500 ring-1 ring-slate-200">
                        {res.level}
                      </span>
                    </div>
                  ))}
                </div>
              </MobileCardShell>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Small pure helper (presentation only, duplicated from parent for independence of mobile component)
function normalizeColorToTone(color: string | null | undefined) {
  if (!color) return "bg-slate-100 text-slate-900 border-slate-200";

  const normalized = color.toLowerCase();

  if (normalized.includes("sky") || normalized.includes("blue") || normalized.startsWith("#")) {
    return "bg-sky-100 text-sky-900 border-sky-200";
  }
  if (normalized.includes("emerald") || normalized.includes("green")) {
    return "bg-emerald-100 text-emerald-950 border-emerald-200";
  }
  if (normalized.includes("violet") || normalized.includes("purple")) {
    return "bg-violet-100 text-violet-950 border-violet-200";
  }
  if (normalized.includes("amber") || normalized.includes("yellow")) {
    return "bg-amber-100 text-amber-950 border-amber-200";
  }
  if (normalized.includes("rose") || normalized.includes("red")) {
    return "bg-rose-100 text-rose-950 border-rose-200";
  }
  return "bg-slate-100 text-slate-900 border-slate-200";
}
