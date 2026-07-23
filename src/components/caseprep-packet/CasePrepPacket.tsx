"use client";

import type { CasePrepPacketState } from "@/lib/caseprep-v1-1/stream-schema";
import { ClarificationPrompt } from "./ClarificationPrompt";
import { PacketHeader, PacketHeaderSkeleton } from "./PacketHeader";
import { PimpQuestionCard } from "./PimpQuestionCard";
import { SectionShell } from "./SectionShell";
import {
  AnatomySection,
  CalloutListSection,
  DecisionPointsSection,
  EvidenceSection,
  KeyTakeaways,
  OperativeFlowSection,
  RelatedConceptsSection,
  SourcesSection,
  TopThingsToKnow,
} from "./sections";
import { useExpandedSections } from "./useExpandedSections";

/** Fixed slot order — streaming arrival order never changes visual order. */
const SECTION_LAYOUT: Array<{
  id: string;
  label: string;
  kicker?: string;
}> = [
  { id: "summary", label: "Procedure Summary" },
  { id: "key_takeaways", label: "Key Takeaways" },
  { id: "top_things_to_know", label: "Top Things To Know" },
  { id: "pimp_questions", label: "Common Pimp Questions", kicker: "Pocket Pimped + Attending" },
  { id: "anatomy", label: "Important Anatomy" },
  { id: "operative_flow", label: "Operative Flow" },
  { id: "teaching_topics", label: "Resident Teaching Topics" },
  { id: "decision_points", label: "Decision Making" },
  { id: "pitfalls", label: "Pitfalls & Bailouts" },
  { id: "postop", label: "Post-op Protocol" },
  { id: "evidence", label: "High-Yield References" },
  { id: "related_concepts", label: "Related Concepts", kicker: "Knowledge Graph" },
  { id: "sources", label: "Sources" },
];

function SectionBody({ id, state }: { id: string; state: CasePrepPacketState }) {
  const section = state.sections[id];
  if (!section) return null;
  switch (id) {
    case "summary":
      return (
        <p className="text-sm leading-7 text-slate-800">
          {section.items.map((item) => item.answer).join(" ")}
        </p>
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
    case "pitfalls":
      return <CalloutListSection items={section.items} tone="amber" />;
    case "teaching_topics":
    case "postop":
      return <CalloutListSection items={section.items} tone="slate" />;
    case "evidence":
      return <EvidenceSection items={section.items} />;
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
  debug = false,
}: {
  state: CasePrepPacketState;
  onClarify: (prompt: string) => void;
  debug?: boolean;
}) {
  const slug = state.caseIdentity?.canonical_slug ?? "";
  const { isExpanded, toggle } = useExpandedSections(slug);
  const streaming = state.status === "connecting" || state.status === "streaming";

  if (state.status === "clarification" && state.clarification) {
    return <ClarificationPrompt clarification={state.clarification} onChoose={onClarify} />;
  }
  if (state.status === "error") {
    return (
      <div className="rounded-[1.75rem] border border-rose-200 bg-rose-50 p-6 text-sm font-semibold text-rose-900">
        {state.errorMessage ?? "Case Prep is temporarily unavailable."}
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {state.header && state.caseIdentity ? (
        <PacketHeader caseIdentity={state.caseIdentity} header={state.header} />
      ) : (
        <PacketHeaderSkeleton />
      )}

      {SECTION_LAYOUT.map(({ id, label, kicker }) => (
        <SectionShell
          key={id}
          label={label}
          kicker={kicker}
          section={state.sections[id]}
          expanded={isExpanded(id)}
          onToggle={() => toggle(id)}
          streaming={streaming && id !== "related_concepts" && id !== "sources"}
          debug={debug}
        >
          <SectionBody id={id} state={state} />
        </SectionShell>
      ))}

      {state.status === "done" && Object.keys(state.sections).length === 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          No preparation content is available for this case yet.
        </div>
      ) : null}
    </div>
  );
}
