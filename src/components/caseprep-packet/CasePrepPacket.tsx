"use client";

import { useState } from "react";

import {
  EssentialsPayloadSchema,
  type CasePrepPacketState,
} from "@/lib/caseprep-v1-1/stream-schema";
import { ClarificationPrompt } from "./ClarificationPrompt";
import { ApproachWorkspace } from "./ApproachWorkspace";
import { ProcedureSummary } from "./ProcedureSummary";
import { PacketHeader, PacketHeaderSkeleton } from "./PacketHeader";
import { PimpQuestionDeck } from "./PimpQuestionDeck";
import { SectionShell } from "./SectionShell";
import {
  AnatomySection,
  CalloutListSection,
  DecisionPointsSection,
  EssentialsSection,
  KeyTakeaways,
  OperativeFlowSection,
  RelatedConceptsSection,
  SourcesSection,
  TopThingsToKnow,
} from "./sections";
import { useExpandedSections } from "./useExpandedSections";

const PROGRESS_STEPS = [
  { phase: "resolving", label: "Identify" },
  { phase: "retrieving", label: "Questions" },
  { phase: "enhancing", label: "Details" },
  { phase: "finalizing", label: "Finish" },
] as const;

function CasePrepLoadingState({
  state,
  onCancel,
}: {
  state: CasePrepPacketState;
  onCancel?: () => void;
}) {
  const progress = state.progress;
  const foundIndex = PROGRESS_STEPS.findIndex(
    (step) => step.phase === progress?.phase,
  );
  const activeIndex = foundIndex < 0 ? 0 : foundIndex;
  const progressWidth = progress
    ? Math.max(
        4,
        Math.min(99, (progress.progress_min + progress.progress_max) / 2),
      )
    : 4;
  return (
    <div
      className="rounded-[1.75rem] border border-emerald-200 bg-white px-6 py-7 shadow-sm"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-4">
        <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-50">
          <span className="absolute h-8 w-8 animate-ping rounded-full border border-emerald-300 opacity-40" />
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-600" />
        </span>
        <div>
          <p className="text-base font-black tracking-tight text-slate-950">
            {state.caseIdentity?.canonical_name ||
              state.requestedPrompt ||
              "Building your case prep packet"}
          </p>
          <div className="mt-1 flex items-center gap-3">
            <p className="text-sm text-slate-600">
              {progress?.label ?? "Starting case preparation…"}
            </p>
            {onCancel ? (
              <button
                type="button"
                onClick={onCancel}
                className="text-xs font-semibold text-slate-500 underline decoration-slate-300 underline-offset-2 hover:text-slate-800"
              >
                Cancel
              </button>
            ) : null}
          </div>
        </div>
      </div>
      <div
        className="mt-5 h-1.5 overflow-hidden rounded-full bg-emerald-50"
        aria-hidden
      >
        <div
          className="h-full rounded-full bg-emerald-500 transition-[width] duration-700 ease-out"
          style={{ width: `${progressWidth}%` }}
        />
      </div>
      <ol
        className="mt-3 grid grid-cols-4 gap-2"
        aria-label="Case preparation progress"
      >
        {PROGRESS_STEPS.map((step, index) => (
          <li
            key={step.phase}
            className={`text-[10px] font-semibold uppercase tracking-wide ${
              index <= activeIndex ? "text-emerald-700" : "text-slate-400"
            }`}
          >
            {step.label}
          </li>
        ))}
      </ol>
    </div>
  );
}

const ESSENTIAL_TABS = [
  { id: "overview", label: "Must-knows" },
  { id: "anatomy", label: "Anatomy" },
  { id: "operative_flow", label: "Operative flow" },
  { id: "decision_points", label: "Decisions" },
  { id: "pitfalls", label: "Pitfalls" },
  { id: "teaching_topics", label: "Teaching topics" },
] as const;

function CaseEssentials({ state }: { state: CasePrepPacketState }) {
  const essentials = EssentialsPayloadSchema.safeParse(
    state.sections.essentials?.payload,
  );
  const hasOverview = Boolean(
    essentials.success ||
    state.sections.summary ||
    state.sections.key_takeaways ||
    state.sections.top_things_to_know,
  );
  const availableTabs = ESSENTIAL_TABS.filter(({ id }) =>
    id === "overview" ? hasOverview : Boolean(state.sections[id]),
  );
  const [requestedTab, setRequestedTab] = useState<string>("overview");
  const [mobileExpanded, setMobileExpanded] = useState<Record<string, boolean>>(
    {
      overview: true,
    },
  );
  const activeTab = availableTabs.some(({ id }) => id === requestedTab)
    ? requestedTab
    : availableTabs[0]?.id;

  if (!activeTab) return null;

  const renderContent = (id: string) => {
    const contentSection = id === "overview" ? undefined : state.sections[id];
    if (id === "overview") {
      if (essentials.success) {
        return <EssentialsSection payload={essentials.data} />;
      }
      return (
        <div className="space-y-5">
          {state.sections.summary ? (
            <ProcedureSummary
              items={state.sections.summary.items}
              decision={state.sections.approach_decision?.payload}
              showApproachContext={false}
            />
          ) : null}
          {state.sections.key_takeaways ? (
            <div>
              <h3 className="mb-2 text-sm font-black text-slate-950">
                Key takeaways
              </h3>
              <KeyTakeaways items={state.sections.key_takeaways.items} />
            </div>
          ) : null}
          {state.sections.top_things_to_know ? (
            <div>
              <h3 className="mb-2 text-sm font-black text-slate-950">
                Top things to know
              </h3>
              <TopThingsToKnow
                items={state.sections.top_things_to_know.items}
              />
            </div>
          ) : null}
        </div>
      );
    }
    if (id === "anatomy" && contentSection)
      return <AnatomySection items={contentSection.items} />;
    if (id === "operative_flow" && contentSection)
      return <OperativeFlowSection items={contentSection.items} />;
    if (id === "decision_points" && contentSection)
      return <DecisionPointsSection items={contentSection.items} />;
    if ((id === "pitfalls" || id === "teaching_topics") && contentSection)
      return (
        <CalloutListSection
          items={contentSection.items}
          tone={id === "pitfalls" ? "amber" : "slate"}
        />
      );
    return null;
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
          3 · Supporting knowledge
        </p>
        <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950">
          Case Essentials
        </h2>
      </div>
      <div className="p-4 sm:p-6">
        <div
          className="hidden gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1 sm:flex"
          role="tablist"
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
                  ? "bg-white text-slate-950 shadow-sm"
                  : "text-slate-600 hover:text-slate-950"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="mt-5 hidden sm:block">{renderContent(activeTab)}</div>
        <div className="space-y-2 sm:hidden">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                const allOpen = availableTabs.every(
                  (tab) => mobileExpanded[tab.id],
                );
                setMobileExpanded(
                  Object.fromEntries(
                    availableTabs.map((tab) => [tab.id, !allOpen]),
                  ),
                );
              }}
              className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700"
            >
              {availableTabs.every((tab) => mobileExpanded[tab.id])
                ? "Collapse all"
                : "Expand all"}
            </button>
          </div>
          {availableTabs.map((tab, index) => {
            const expanded = Boolean(mobileExpanded[tab.id]);
            const panelId = `essentials-mobile-${tab.id}`;
            return (
              <section
                key={tab.id}
                className="overflow-hidden rounded-xl border border-slate-200"
              >
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
                    <span className="mr-2 text-[10px] font-black text-slate-400">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="text-sm font-black text-slate-950">
                      {tab.label}
                    </span>
                  </span>
                  <span
                    className="text-xl font-light text-slate-500"
                    aria-hidden
                  >
                    {expanded ? "−" : "+"}
                  </span>
                </button>
                {expanded ? (
                  <div id={panelId} className="border-t border-slate-100 p-3">
                    {renderContent(tab.id)}
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function CasePrepPacket({
  state,
  onClarify,
  onCancel,
  onRetry,
  debug = false,
}: {
  state: CasePrepPacketState;
  onClarify: (prompt: string) => void;
  onCancel?: () => void;
  onRetry?: () => void;
  debug?: boolean;
}) {
  const slug = state.caseIdentity?.canonical_slug ?? "";
  const { isExpanded, toggle } = useExpandedSections(slug);
  const streaming =
    state.status === "connecting" || state.status === "streaming";
  const referenceSection =
    state.sections.sources ??
    state.sections.evidence ??
    state.sections.related_concepts;

  if (state.status === "clarification" && state.clarification) {
    return (
      <ClarificationPrompt
        clarification={state.clarification}
        onChoose={onClarify}
      />
    );
  }
  if (state.status === "error") {
    return (
      <div className="rounded-[1.75rem] border border-rose-200 bg-rose-50 p-6 text-sm font-semibold text-rose-900">
        <p>{state.errorMessage ?? "Case Prep is temporarily unavailable."}</p>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 rounded-full bg-rose-700 px-4 py-2 text-xs font-bold text-white hover:bg-rose-800"
          >
            Try again
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {streaming ? (
        <CasePrepLoadingState state={state} onCancel={onCancel} />
      ) : null}
      {state.header && state.caseIdentity ? (
        <PacketHeader caseIdentity={state.caseIdentity} header={state.header} />
      ) : streaming ? (
        <PacketHeaderSkeleton />
      ) : null}

      <ApproachWorkspace sections={state.sections} streaming={streaming} />

      {state.sections.pimp_questions ? (
        <PimpQuestionDeck items={state.sections.pimp_questions.items} />
      ) : streaming ? (
        <div className="rounded-2xl border border-teal-200 bg-white p-6">
          <div className="h-5 w-48 animate-pulse rounded bg-teal-50" />
          <div className="mt-4 grid gap-3 lg:grid-cols-2" aria-hidden>
            <div className="h-28 animate-pulse rounded-xl bg-slate-100" />
            <div className="h-28 animate-pulse rounded-xl bg-slate-100" />
          </div>
        </div>
      ) : null}

      <CaseEssentials state={state} />

      <SectionShell
        label="After the Case"
        kicker="Post-op protocol"
        section={state.sections.postop}
        expanded={isExpanded("postop")}
        onToggle={() => toggle("postop")}
        streaming={false}
        debug={debug}
      >
        {state.sections.postop ? (
          <CalloutListSection
            items={state.sections.postop.items}
            tone="slate"
          />
        ) : null}
      </SectionShell>

      <SectionShell
        label="References & More"
        kicker="Evidence · sources · related concepts"
        section={referenceSection}
        expanded={isExpanded("references")}
        onToggle={() => toggle("references")}
        streaming={false}
        debug={debug}
      >
        <div className="space-y-6">
          {state.sections.sources ? (
            <div>
              <h3 className="mb-2 text-sm font-black text-slate-950">
                Sources &amp; further reading
              </h3>
              <SourcesSection section={state.sections.sources} />
            </div>
          ) : null}
          {state.sections.related_concepts ? (
            <div>
              <h3 className="mb-2 text-sm font-black text-slate-950">
                Related concepts
              </h3>
              <RelatedConceptsSection
                items={state.sections.related_concepts.items}
              />
            </div>
          ) : null}
        </div>
      </SectionShell>

      {state.status === "done" && Object.keys(state.sections).length === 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          No preparation content is available for this case yet.
        </div>
      ) : null}
    </div>
  );
}
