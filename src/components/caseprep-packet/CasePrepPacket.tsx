"use client";

import type { CasePrepPacketState } from "@/lib/caseprep-v1-1/stream-schema";
import { ClarificationPrompt } from "./ClarificationPrompt";
import { ApproachDecisionSection } from "./ApproachDecisionSection";
import { ProcedureSummary } from "./ProcedureSummary";
import { HighYieldReferences } from "./HighYieldReferences";
import { PacketHeader, PacketHeaderSkeleton } from "./PacketHeader";
import { PimpQuestionCard } from "./PimpQuestionCard";
import { SectionShell } from "./SectionShell";
import {
  AnatomySection,
  CalloutListSection,
  DecisionPointsSection,
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

/** Fixed slot order — streaming arrival order never changes visual order. */
const SECTION_LAYOUT: Array<{
  id: string;
  label: string;
  kicker?: string;
}> = [
  { id: "approach_decision", label: "Approach Decision" },
  { id: "summary", label: "Case Must-Knows" },
  {
    id: "pimp_questions",
    label: "Common Pimp Questions",
    kicker: "Pocket Pimped + Attending",
  },
  { id: "key_takeaways", label: "Key Takeaways" },
  { id: "top_things_to_know", label: "Top Things To Know" },
  { id: "anatomy", label: "Important Anatomy" },
  { id: "operative_flow", label: "Operative Flow" },
  { id: "decision_points", label: "Decision Making" },
  { id: "postop", label: "Post-op Protocol" },
  { id: "evidence", label: "High-Yield References" },
  {
    id: "related_concepts",
    label: "Related Concepts",
    kicker: "Knowledge Graph",
  },
  { id: "sources", label: "Sources" },
];

function SectionBody({
  id,
  state,
}: {
  id: string;
  state: CasePrepPacketState;
}) {
  const section = state.sections[id];
  if (!section) return null;
  switch (id) {
    case "approach_decision":
      return <ApproachDecisionSection payload={section.payload} />;
    case "summary":
      return (
        <ProcedureSummary
          items={section.items}
          decision={state.sections.approach_decision?.payload}
        />
      );
    case "key_takeaways":
      return <KeyTakeaways items={section.items} />;
    case "top_things_to_know":
      return <TopThingsToKnow items={section.items} />;
    case "pimp_questions":
      return (
        <div className="grid gap-3">
          {section.items.map((item, index) => (
            <PimpQuestionCard key={item.id} item={item} index={index} />
          ))}
        </div>
      );
    case "anatomy":
      return <AnatomySection items={section.items} />;
    case "operative_flow":
      return <OperativeFlowSection items={section.items} />;
    case "decision_points":
      return <DecisionPointsSection items={section.items} />;
    case "postop":
      return <CalloutListSection items={section.items} tone="slate" />;
    case "related_concepts":
      return <RelatedConceptsSection items={section.items} />;
    case "sources":
      return <SourcesSection section={section} />;
    default:
      return null;
  }
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
  const dynamicReferencesSection =
    state.sections.evidence ??
    (state.caseIdentity?.canonical_slug && state.header
      ? {
          status: "complete" as const,
          items: [],
          payload: { dynamic: true },
          source: "read_next",
          generatedFieldPaths: [],
        }
      : undefined);

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
    <div className="grid gap-4">
      {streaming ? (
        <CasePrepLoadingState state={state} onCancel={onCancel} />
      ) : null}
      {state.header && state.caseIdentity ? (
        <PacketHeader caseIdentity={state.caseIdentity} header={state.header} />
      ) : streaming ? (
        <PacketHeaderSkeleton />
      ) : null}

      {state.coverage && state.coverage.quality_gate !== "passed" ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-bold">
            Grounded coverage is limited for this case.
          </p>
          <p className="mt-1 text-amber-800">
            Unsupported sections were omitted instead of filled with generic AI
            content.
            {state.coverage.omitted_sections.length > 0
              ? ` Missing: ${state.coverage.omitted_sections.join(", ").replaceAll("_", " ")}.`
              : ""}
          </p>
        </div>
      ) : null}

      {SECTION_LAYOUT.map(({ id, label, kicker }) => {
        const expanded = isExpanded(id);
        return (
          <SectionShell
            key={id}
            label={label}
            kicker={kicker}
            section={
              id === "evidence" ? dynamicReferencesSection : state.sections[id]
            }
            expanded={expanded}
            onToggle={() => toggle(id)}
            streaming={
              streaming &&
              // Keep one meaningful pending slot instead of a wall of skeletons.
              id === "pimp_questions"
            }
            debug={debug}
          >
            {id === "evidence" ? (
              <HighYieldReferences state={state} active={expanded} />
            ) : (
              <SectionBody id={id} state={state} />
            )}
          </SectionShell>
        );
      })}

      {state.status === "done" && Object.keys(state.sections).length === 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          No preparation content is available for this case yet.
        </div>
      ) : null}
    </div>
  );
}
