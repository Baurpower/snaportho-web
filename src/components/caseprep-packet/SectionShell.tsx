"use client";

import { type ReactNode } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";

import type { PacketSectionState } from "@/lib/caseprep-v1-1/stream-schema";
import { DebugSourceBadge } from "./DebugSourceBadge";

export function SectionSkeleton({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>
      <div className="mt-3 space-y-2" aria-hidden>
        <div className="h-3 w-3/4 animate-pulse rounded bg-slate-100" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-slate-100" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
      </div>
    </div>
  );
}

export function SectionShell({
  label,
  kicker,
  section,
  expanded,
  onToggle,
  streaming,
  debug,
  children,
}: {
  label: string;
  kicker?: string;
  section: PacketSectionState | undefined;
  expanded: boolean;
  onToggle: () => void;
  streaming: boolean;
  debug: boolean;
  children: ReactNode;
}) {
  if (!section) {
    // Skeleton only while the stream may still deliver this section.
    return streaming ? <SectionSkeleton label={label} /> : null;
  }
  if (section.status === "error") {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <span className="font-semibold">{label}</span> is unavailable for this case right now.
      </div>
    );
  }
  if (section.items.length === 0 && !section.payload) return null;

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50"
      >
        <span>
          {kicker ? (
            <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
              {kicker}
            </span>
          ) : null}
          <span className="text-base font-black tracking-tight text-slate-950">{label}</span>
        </span>
        <span className="flex items-center gap-2">
          {section.status === "partial" ? (
            <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-800">
              enhancing…
            </span>
          ) : null}
          <DebugSourceBadge section={section} show={debug} />
          <ChevronDownIcon
            className={`h-4 w-4 text-slate-400 transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </span>
      </button>
      {expanded ? <div className="border-t border-slate-100 px-4 py-4">{children}</div> : null}
    </section>
  );
}
