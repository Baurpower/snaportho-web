"use client";

import { useMemo, useState } from "react";

import type { PacketSectionState } from "@/lib/caseprep-v1-1/stream-schema";
import { ApproachDecisionSection } from "./ApproachDecisionSection";
import { ApproachPrepSection, ApproachSourcesSection } from "./sections";
import type { ApproachOption } from "./approach-decision";

type ApproachTab = "brief" | "exposure" | "safety" | "strategy" | "sources";

const TAB_CONFIG: Array<{ id: ApproachTab; label: string; sectionId: string }> = [
  { id: "brief", label: "Setup", sectionId: "approach_quick_brief" },
  { id: "exposure", label: "Exposure", sectionId: "approach_exposure" },
  { id: "safety", label: "Safety", sectionId: "approach_safety" },
  { id: "strategy", label: "Strategy", sectionId: "approach_strategy" },
  { id: "sources", label: "Sources", sectionId: "approach_sources" },
];

export function ApproachWorkspace({
  sections,
  streaming,
}: {
  sections: Partial<Record<string, PacketSectionState>>;
  streaming: boolean;
}) {
  const availableTabs = useMemo(
    () =>
      TAB_CONFIG.filter(({ sectionId }) => {
        const section = sections[sectionId];
        return Boolean(section && (section.items.length > 0 || section.payload));
      }),
    [sections],
  );
  const [requestedTab, setRequestedTab] = useState<ApproachTab>("brief");
  const [activeApproach, setActiveApproach] = useState<ApproachOption | null>(null);
  const [mobileExpanded, setMobileExpanded] = useState<Record<string, boolean>>({
    brief: true,
  });
  const activeTab = availableTabs.some((tab) => tab.id === requestedTab)
    ? requestedTab
    : availableTabs[0]?.id;
  const activeConfig = availableTabs.find((tab) => tab.id === activeTab);
  const activeSection = activeConfig
    ? sections[activeConfig.sectionId]
    : undefined;
  const decision = sections.approach_decision;
  const hasContent = Boolean(decision || availableTabs.length > 0);

  const itemsForApproach = (section: PacketSectionState) => {
    const approachName = activeApproach?.name?.trim().toLowerCase();
    if (!approachName) return section.items;
    const matching = section.items.filter(
      (item) =>
        typeof item.approach_name === "string" &&
        item.approach_name.trim().toLowerCase() === approachName,
    );
    return matching.length > 0 ? matching : section.items;
  };

  if (!hasContent && !streaming) return null;

  return (
    <section className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm">
      <div className="border-b border-emerald-100 bg-gradient-to-r from-emerald-50/80 to-white px-5 py-4 sm:px-6">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-700">
          1 · Primary
        </p>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-xl font-black tracking-tight text-slate-950">
              Surgical Approach
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Confirm the corridor, then review exposure and structures at risk.
            </p>
          </div>
          {streaming ? (
            <span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-800">
              Building approach…
            </span>
          ) : null}
        </div>
      </div>

      <div className="space-y-5 p-4 sm:p-6">
        {decision ? (
          <ApproachDecisionSection
            payload={decision.payload}
            onActiveApproachChange={setActiveApproach}
          />
        ) : streaming ? (
          <div className="h-28 animate-pulse rounded-2xl bg-slate-100" aria-hidden />
        ) : null}

        {availableTabs.length > 0 ? (
          <div className="hidden sm:block">
            <div
              className="flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1"
              role="tablist"
              aria-label="Approach details"
            >
              {availableTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  onClick={() => setRequestedTab(tab.id)}
                  className={`shrink-0 rounded-lg px-3.5 py-2 text-xs font-bold transition sm:flex-1 ${
                    activeTab === tab.id
                      ? "bg-white text-emerald-800 shadow-sm"
                      : "text-slate-600 hover:text-slate-950"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/50 p-4">
              {activeConfig?.id === "sources" && activeSection ? (
                <ApproachSourcesSection section={activeSection} />
              ) : activeSection ? (
                <ApproachPrepSection items={itemsForApproach(activeSection)} />
              ) : null}
            </div>
          </div>
        ) : null}

        {availableTabs.length > 0 ? (
          <div className="sm:hidden">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-xs font-bold text-slate-600">Approach guide</p>
              <button
                type="button"
                onClick={() => {
                  const allOpen = availableTabs.every((tab) => mobileExpanded[tab.id]);
                  setMobileExpanded(
                    Object.fromEntries(availableTabs.map((tab) => [tab.id, !allOpen])),
                  );
                }}
                className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700"
              >
                {availableTabs.every((tab) => mobileExpanded[tab.id])
                  ? "Collapse all"
                  : "Expand all"}
              </button>
            </div>
            <div className="space-y-2">
              {availableTabs.map((tab, index) => {
                const section = sections[tab.sectionId];
                const expanded = Boolean(mobileExpanded[tab.id]);
                const panelId = `approach-mobile-${tab.id}`;
                return (
                  <section key={tab.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <button
                      type="button"
                      aria-expanded={expanded}
                      aria-controls={panelId}
                      onClick={() =>
                        setMobileExpanded((current) => ({
                          ...current,
                          [tab.id]: !expanded,
                        }))
                      }
                      className="flex min-h-14 w-full items-center justify-between gap-3 px-4 py-3 text-left"
                    >
                      <span>
                        <span className="block text-[10px] font-black uppercase tracking-wider text-emerald-700">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <span className="text-sm font-black text-slate-950">{tab.label}</span>
                      </span>
                      <span className="text-xl font-light text-slate-500" aria-hidden>
                        {expanded ? "−" : "+"}
                      </span>
                    </button>
                    {expanded && section ? (
                      <div id={panelId} className="border-t border-slate-100 bg-slate-50/50 p-3">
                        {tab.id === "sources" ? (
                          <ApproachSourcesSection section={section} />
                        ) : (
                          <ApproachPrepSection items={itemsForApproach(section)} />
                        )}
                      </div>
                    ) : null}
                  </section>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
