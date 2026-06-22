"use client";

import React, { useState } from "react";
import { Star, ChevronDown, ChevronUp, Zap } from "lucide-react";
import type { ApSectionWithItems } from "@/lib/workspace/preferences/types";

type Props = {
  sections: ApSectionWithItems[];
};

export function BeforeYouScrubBanner({ sections }: Props) {
  const [expanded, setExpanded] = useState(true);

  const highYieldItems = sections
    .flatMap((s) => s.items.map((item) => ({ ...item, sectionTitle: s.title })))
    .filter((i) => i.isHighYield && i.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const isEmpty = highYieldItems.length === 0;

  return (
    <div className="mb-6 rounded-[1.5rem] border border-amber-400/25 bg-amber-500/[0.08]">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-3.5 px-5 py-4"
      >
        {/* Star icon block — always amber */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-400/15 text-amber-300">
          <Star className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1 text-left">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-bold text-amber-200">Before You Scrub</p>
            <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[11px] font-semibold text-amber-300">
              {highYieldItems.length} item{highYieldItems.length !== 1 ? "s" : ""}
            </span>
          </div>

          {isEmpty ? (
            <p className="mt-0.5 text-xs text-amber-300/55">
              Mark items as{" "}
              <span className="inline-flex items-center gap-0.5 font-semibold text-amber-300/80">
                <Zap className="h-3 w-3" /> high-yield
              </span>{" "}
              to build your pre-case checklist.
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-amber-300/55">
              Review before every case.
            </p>
          )}
        </div>

        {expanded ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-amber-300/50" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-amber-300/50" />
        )}
      </button>

      {/* Filled: show items */}
      {expanded && !isEmpty && (
        <div className="border-t border-amber-400/10 px-5 pb-4 pt-3">
          <ul className="space-y-2">
            {highYieldItems.map((item) => (
              <li key={item.id} className="flex items-start gap-2.5">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                <div>
                  <p className="text-sm leading-snug text-white/90">{item.content}</p>
                  <p className="mt-0.5 text-[11px] text-white/35">{item.sectionTitle}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
