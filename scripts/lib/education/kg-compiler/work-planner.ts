import {
  buildWorkAssignmentsFromGaps,
  topologicalSortAssignments,
} from "../kg-agent-framework/work-assignment.ts";
import { getAgentRegistry } from "../kg-agent-framework/registry.ts";
import { registerDefaultAgents } from "../kg-agent-framework/register-default-agents.ts";
import type { AgentFamily, OntologyGap, WorkItem, WorkPlan } from "./types.ts";

/** Map agent registry id → legacy AgentFamily label for backward-compatible reports. */
const AGENT_ID_TO_FAMILY: Record<string, AgentFamily> = {
  "anatomy-builder": "Anatomy Builder",
  "clinical-entity-builder": "Clinical Entity Builder",
  "relationship-builder": "Relationship Builder",
  "claim-builder": "Claim Builder",
  "decision-point-builder": "Decision Point Builder",
  "metadata-builder": "Metadata Builder",
  "asset-linker": "Asset Linker",
  "provenance-builder": "Provenance Builder",
  "review-assistant": "Review Assistant",
  "publication-validator": "Publication Validator",
  "duplicate-detector": "Conflict Resolver",
  "conflict-resolver": "Conflict Resolver",
  "quality-scorer": "Quality Scorer",
};

function familyForAgentId(agentId: string): AgentFamily {
  return AGENT_ID_TO_FAMILY[agentId] ?? "Clinical Entity Builder";
}

export function buildWorkPlan(
  topicKey: string,
  pilotKey: string,
  gaps: OntologyGap[]
): WorkPlan {
  registerDefaultAgents();
  const assignments = buildWorkAssignmentsFromGaps(gaps);

  const workItems: WorkItem[] = assignments.map((a) => ({
    id: a.id,
    agentId: a.assignedAgentId,
    agentFamily: familyForAgentId(a.assignedAgentId),
    title: `${familyForAgentId(a.assignedAgentId)}: ${a.gaps.length ? `resolve ${a.gaps.length} gap(s)` : a.type}`,
    gapIds: a.gapIds,
    dependencies: a.dependencies,
    estimatedConfidence: a.estimatedConfidence,
    requiredInputs: a.requiredInputs,
    requiredOutputs: a.requiredOutputs,
    validationRules: a.validationRules,
    priority: a.priority,
    workType: a.type,
    assignedAgentId: a.assignedAgentId,
    publicationImpact: a.publicationImpact,
    requiredReviewer: a.requiredReviewer,
  }));

  const agentSummary = {} as Record<AgentFamily, number>;
  for (const item of workItems) {
    agentSummary[item.agentFamily] = (agentSummary[item.agentFamily] ?? 0) + 1;
  }

  const registry = getAgentRegistry();

  return {
    topicKey,
    pilotKey,
    generatedAt: new Date().toISOString(),
    workItems,
    agentSummary,
    executionOrder: topologicalSortAssignments(assignments),
    registryDiscovery: registry.discoverCapabilities(),
  };
}