/**
 * Agent contract reports for Ontology Compiler output.
 */

import type { AutoReviewReport } from "../kg-compiler/types.ts";
import type { OntologyGap, WorkPlan } from "../kg-compiler/types.ts";
import { FRAMEWORK_CONTRACT_VERSION } from "./versioning.ts";
import type { AgentRegistry } from "./registry.ts";
import type { AgentExecutionReport } from "./orchestrator.ts";
import { buildWorkAssignmentsFromGaps } from "./work-assignment.ts";

export type AgentAssignmentPlan = {
  generatedAt: string;
  frameworkVersion: typeof FRAMEWORK_CONTRACT_VERSION;
  topicKey: string;
  pilotKey: string;
  assignments: Array<{
    workItemId: string;
    agentId: string;
    agentName: string;
    type: string;
    gapCount: number;
    gapIds: string[];
    gapKinds: string[];
    dependencies: string[];
    estimatedConfidence: number;
    requiredReviewer: string;
    matchReasons: string[];
  }>;
  executionOrder: string[];
  registryAgentCount: number;
};

export type UnmetAgentCapabilities = {
  generatedAt: string;
  frameworkVersion: typeof FRAMEWORK_CONTRACT_VERSION;
  topicKey: string;
  unmetCount: number;
  unmetGaps: Array<{
    gapId: string;
    kind: string;
    ontologyRule: string;
    reason: string;
    requiredReviewer: string;
    attemptedAgents: string[];
  }>;
  registeredCapabilities: Array<{
    agentId: string;
    handlesGapKinds: string[];
    handlesEntityTypes?: string[];
    handlesOntologyRulePrefixes?: string[];
    isGenericFallback?: boolean;
  }>;
};

export function buildAgentAssignmentPlan(
  topicKey: string,
  pilotKey: string,
  gaps: OntologyGap[],
  workPlan: WorkPlan,
  registry: AgentRegistry
): AgentAssignmentPlan {
  const assignments = buildWorkAssignmentsFromGaps(gaps);

  return {
    generatedAt: new Date().toISOString(),
    frameworkVersion: FRAMEWORK_CONTRACT_VERSION,
    topicKey,
    pilotKey,
    assignments: workPlan.workItems
      .filter((w) => w.workType === "gap_resolution" || !w.workType)
      .map((item) => {
        const agent = registry.get(item.agentId);
        const itemGaps = gaps.filter((g) => item.gapIds.includes(g.id));
        const matchReasons = itemGaps.flatMap((g) => {
          const candidates = registry.resolveCandidatesForGap(g);
          const winner = candidates[0];
          return winner && winner.agent.identity.id === item.agentId
            ? winner.reasons
            : [];
        });

        return {
          workItemId: item.id,
          agentId: item.agentId,
          agentName: agent?.identity.name ?? item.agentFamily,
          type: item.workType ?? "gap_resolution",
          gapCount: item.gapIds.length,
          gapIds: item.gapIds,
          gapKinds: [...new Set(itemGaps.map((g) => g.kind))],
          dependencies: item.dependencies,
          estimatedConfidence: item.estimatedConfidence,
          requiredReviewer: item.requiredReviewer ?? "none",
          matchReasons: [...new Set(matchReasons)],
        };
      }),
    executionOrder: workPlan.executionOrder,
    registryAgentCount: registry.list().length,
  };
}

export function buildUnmetAgentCapabilities(
  topicKey: string,
  gaps: OntologyGap[],
  registry: AgentRegistry
): UnmetAgentCapabilities {
  const unmetGaps = registry.resolveUnmetGaps(gaps);

  return {
    generatedAt: new Date().toISOString(),
    frameworkVersion: FRAMEWORK_CONTRACT_VERSION,
    topicKey,
    unmetCount: unmetGaps.length,
    unmetGaps: unmetGaps.map((gap) => ({
      gapId: gap.id,
      kind: gap.kind,
      ontologyRule: gap.ontologyRule,
      reason: gap.reason,
      requiredReviewer: gap.requiredReviewer,
      attemptedAgents: registry
        .list()
        .filter((a) => a.capabilities.handlesGapKinds.includes(gap.kind))
        .map((a) => a.identity.id),
    })),
    registeredCapabilities: registry.discoverCapabilities().map((c) => ({
      agentId: c.id,
      handlesGapKinds: c.handlesGapKinds,
      handlesEntityTypes: c.handlesEntityTypes,
      handlesOntologyRulePrefixes: c.handlesOntologyRulePrefixes,
      isGenericFallback: c.isGenericFallback,
    })),
  };
}

export function buildReviewerBurdenEstimate(
  autoReview: AutoReviewReport,
  workPlan: WorkPlan
): string {
  const attendingItems = autoReview.decisions.filter(
    (d) => d.humanReviewerType === "attending" || d.category === "EXPERT_REVIEW"
  ).length;
  const curatorItems = autoReview.decisions.filter(
    (d) => d.humanReviewerType === "curator" || d.category === "SAFE_REVIEW"
  ).length;
  const conflicted = autoReview.decisions.filter((d) => d.curationRoute === "REJECTED").length;
  const gapResolutionItems = workPlan.workItems.filter((w) => w.gapIds.length > 0).length;

  const totalBurden = attendingItems * 3 + curatorItems * 1 + conflicted * 2;
  const band = totalBurden >= 40 ? "high" : totalBurden >= 15 ? "medium" : "low";

  return [
    "# Reviewer Burden Estimate",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Summary",
    "",
    `| Metric | Value |`,
    `|--------|------:|`,
    `| Human review rate | ${autoReview.humanReviewPercent}% |`,
    `| Auto-approved rate | ${autoReview.autoApprovedPercent}% |`,
    `| Attending review items | ${attendingItems} |`,
    `| Curator review items | ${curatorItems} |`,
    `| Rejected / conflict signals | ${conflicted} |`,
    `| Gap-resolution work items | ${gapResolutionItems} |`,
    `| Estimated burden band | **${band}** |`,
    "",
    "## Route distribution",
    "",
    `| Route | Count |`,
    `|-------|------:|`,
    `| AUTO_APPROVE | ${autoReview.summary.AUTO_APPROVE} |`,
    `| SAFE_REVIEW | ${autoReview.summary.SAFE_REVIEW} |`,
    `| EXPERT_REVIEW | ${autoReview.summary.EXPERT_REVIEW} |`,
    `| REJECT | ${autoReview.summary.REJECT} |`,
    "",
    "## Agent work plan",
    "",
    ...workPlan.workItems.map(
      (w) =>
        `- **${w.agentFamily}** (${w.agentId}): ${w.gapIds.length} gap(s), reviewer=${w.requiredReviewer ?? "none"}`
    ),
    "",
    "## Constraints",
    "",
    "- Attending-gated items are never auto-approved by the contract framework.",
    "- All routing is deterministic and explainable (no opaque AI scores).",
    "",
  ].join("\n");
}

export function buildAgentOutputSummary(report: AgentExecutionReport): string {
  return [
    "# Agent Output Summary",
    "",
    `Generated: ${report.generatedAt}`,
    `Topic: **${report.topicKey}**`,
    `Framework: **${report.frameworkVersion}**`,
    "",
    "## Execution",
    "",
    `| Metric | Value |`,
    `|--------|------:|`,
    `| Agents executed | ${report.entries.length} |`,
    `| Completed | ${report.completedAgents} |`,
    `| Partial | ${report.partialAgents} |`,
    `| Failed | ${report.failedAgents} |`,
    `| Skipped | ${report.skippedAgents} |`,
    `| Unique proposals | ${report.uniqueProposals} |`,
    `| Total proposals emitted | ${report.totalProposalsEmitted} |`,
    "",
    "## Parallel layers",
    "",
    ...report.parallelLayers.map(
      (layer, i) => `- Layer ${i + 1}: ${layer.join(", ")}`
    ),
    "",
    "## Per-agent results",
    "",
    ...report.entries.map(
      (e) =>
        `- **${e.agentId}** (${e.assignmentId}): ${e.status}, ${e.proposalCount} proposal(s), ${e.executionTimeMs}ms${e.timedOut ? " [TIMEOUT]" : ""}${e.skipped ? " [SKIPPED]" : ""}`
    ),
    "",
    "## Constraints",
    "",
    "- Database modified: **no**",
    "- Auto-published: **no**",
    "",
  ].join("\n");
}

export function buildAgentContractSummary(
  topicKey: string,
  assignmentPlan: AgentAssignmentPlan,
  unmet: UnmetAgentCapabilities
): string {
  return [
    "# Agent Contract Summary",
    "",
    `Topic: **${topicKey}**`,
    `Framework: **${FRAMEWORK_CONTRACT_VERSION}**`,
    `Generated: ${assignmentPlan.generatedAt}`,
    "",
    "## Registry",
    "",
    `- Registered agents: ${assignmentPlan.registryAgentCount}`,
    `- Gap-resolution assignments: ${assignmentPlan.assignments.length}`,
    `- Unmet gap capabilities: ${unmet.unmetCount}`,
    "",
    "## Assignments",
    "",
    ...assignmentPlan.assignments.map(
      (a) =>
        `- **${a.agentName}** (${a.agentId}): ${a.gapCount} gap(s) [${a.gapKinds.join(", ")}] — ${a.matchReasons.join("; ") || "post-processing"}`
    ),
    "",
    "## Contract guarantees",
    "",
    "- Every agent declares id, version, ontology version, capabilities, gap types, proposal types, inputs, safety limits, and escalation rules.",
    "- Every agent output includes proposal envelopes, confidence breakdown, validation, review recommendation, warnings, errors, metrics, and audit trail.",
    "- Capability matching is prefix-opt-in; generic fallback agents run last.",
    "",
    "## Remaining before parallel agents",
    "",
    unmet.unmetCount > 0
      ? `- Implement agents for ${unmet.unmetCount} unmet gap(s): ${unmet.unmetGaps.map((g) => g.kind).join(", ")}`
      : "- All current ankle-fracture gaps map to registered reference adapters.",
    "- Stage 5 agent orchestration is executable; gap agents resolve pilot proposals deterministically.",
    "- Full autonomous content generation (beyond pilot proposal matching) remains future work.",
    "",
  ].join("\n");
}