/**
 * Build WorkAssignment objects from gaps using the Agent Registry.
 */

import type { OntologyGap } from "../kg-compiler/types.ts";
import type { WorkAssignment, WorkAssignmentType } from "./contract.ts";
import { getAgentRegistry } from "./registry.ts";
import { registerDefaultAgents } from "./register-default-agents.ts";

function priorityScore(gap: OntologyGap): number {
  const base = { critical: 100, high: 75, medium: 50, low: 25 }[gap.priority];
  return base + gap.maturityImpact * 100;
}

function complexityFromGaps(count: number): WorkAssignment["estimatedComplexity"] {
  if (count >= 8) return "high";
  if (count >= 3) return "medium";
  return "low";
}

export function buildWorkAssignmentsFromGaps(gaps: OntologyGap[]): WorkAssignment[] {
  registerDefaultAgents();
  const registry = getAgentRegistry();
  const grouped = registry.groupGapsByAgent(gaps);
  const assignments: WorkAssignment[] = [];
  const byAgentId = new Map<string, WorkAssignment>();

  for (const [agentId, { agent, gaps: agentGaps }] of grouped) {
    const assignment: WorkAssignment = {
      id: `work-${agentId}`,
      type: "gap_resolution",
      priority: Math.max(...agentGaps.map(priorityScore)),
      dependencies: agent.capabilities.requires.map((r) => `work-${r}`),
      requiredInputs: agent.capabilities.consumes,
      requiredOutputs: agent.capabilities.produces,
      estimatedComplexity: complexityFromGaps(agentGaps.length),
      estimatedConfidence:
        agentGaps.reduce((s, g) => s + g.confidence, 0) / Math.max(agentGaps.length, 1),
      ontologyReferences: agentGaps.map((g) => g.ontologyRule),
      validationRules: agent.capabilities.validationCategories.map((c) => `${c}_valid`),
      requiredReviewer: agentGaps.some((g) => g.requiredReviewer === "attending")
        ? "attending"
        : agentGaps.some((g) => g.requiredReviewer === "clinical_expert")
          ? "clinical_expert"
          : "none",
      publicationImpact:
        agentGaps.reduce((s, g) => s + g.maturityImpact, 0) / Math.max(agentGaps.length, 1),
      gapIds: agentGaps.map((g) => g.id),
      gaps: agentGaps,
      assignedAgentId: agentId,
    };
    assignments.push(assignment);
    byAgentId.set(agentId, assignment);
  }

  const gapAssignmentIds = assignments.map((a) => a.id);

  const dupAgent = registry.get("duplicate-detector");
  if (dupAgent) {
    assignments.push({
      id: "work-duplicate-detector",
      type: "quality_scoring",
      priority: 85,
      dependencies: gapAssignmentIds,
      requiredInputs: dupAgent.capabilities.consumes,
      requiredOutputs: dupAgent.capabilities.produces,
      estimatedComplexity: "low",
      estimatedConfidence: 0.9,
      ontologyReferences: [],
      validationRules: ["duplicate_valid"],
      requiredReviewer: "none",
      publicationImpact: 0.2,
      gapIds: [],
      gaps: [],
      assignedAgentId: dupAgent.identity.id,
    });
  }

  const qualityAgent = registry.get("quality-scorer");
  if (qualityAgent) {
    assignments.push({
      id: "work-quality-scorer",
      type: "quality_scoring",
      priority: 86,
      dependencies: dupAgent ? ["work-duplicate-detector"] : gapAssignmentIds,
      requiredInputs: qualityAgent.capabilities.consumes,
      requiredOutputs: qualityAgent.capabilities.produces,
      estimatedComplexity: "low",
      estimatedConfidence: 0.92,
      ontologyReferences: [],
      validationRules: ["schema_valid"],
      requiredReviewer: "none",
      publicationImpact: 0.3,
      gapIds: [],
      gaps: [],
      assignedAgentId: qualityAgent.identity.id,
    });
  }

  const conflictAgent = registry.get("conflict-resolver");
  if (conflictAgent) {
    assignments.push({
      id: "work-conflict-resolver",
      type: "quality_scoring",
      priority: 87,
      dependencies: qualityAgent ? ["work-quality-scorer"] : gapAssignmentIds,
      requiredInputs: conflictAgent.capabilities.consumes,
      requiredOutputs: conflictAgent.capabilities.produces,
      estimatedComplexity: "medium",
      estimatedConfidence: 0.88,
      ontologyReferences: [],
      validationRules: ["safety_valid", "publication_valid"],
      requiredReviewer: "none",
      publicationImpact: 0.4,
      gapIds: [],
      gaps: [],
      assignedAgentId: conflictAgent.identity.id,
    });
  }

  // Post-processing agents from registry
  const reviewAgent = registry.resolveForWorkType("review");
  if (reviewAgent) {
    assignments.push({
      id: `work-${reviewAgent.identity.id}`,
      type: "review",
      priority: 90,
      dependencies: [
        ...assignments.filter((a) => a.type === "gap_resolution").map((a) => a.id),
        ...(conflictAgent ? ["work-conflict-resolver"] : []),
      ],
      requiredInputs: reviewAgent.capabilities.consumes,
      requiredOutputs: reviewAgent.capabilities.produces,
      estimatedComplexity: "medium",
      estimatedConfidence: 0.95,
      ontologyReferences: [],
      validationRules: ["explainable_scores", "no_opaque_ai_score"],
      requiredReviewer: "none",
      publicationImpact: 0.5,
      gapIds: [],
      gaps: [],
      assignedAgentId: reviewAgent.identity.id,
    });
  }

  const pubAgent = registry.resolveForWorkType("publication_validation");
  if (pubAgent) {
    assignments.push({
      id: `work-${pubAgent.identity.id}`,
      type: "publication_validation",
      priority: 95,
      dependencies: reviewAgent ? [`work-${reviewAgent.identity.id}`] : [],
      requiredInputs: pubAgent.capabilities.consumes,
      requiredOutputs: pubAgent.capabilities.produces,
      estimatedComplexity: "low",
      estimatedConfidence: 0.98,
      ontologyReferences: [],
      validationRules: ["no_auto_publish", "draft_leak_blocked"],
      requiredReviewer: "none",
      publicationImpact: 1,
      gapIds: [],
      gaps: [],
      assignedAgentId: pubAgent.identity.id,
    });
  }

  return assignments;
}

export function topologicalSortAssignments(assignments: WorkAssignment[]): string[] {
  const order: string[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const byId = new Map(assignments.map((a) => [a.id, a]));

  function visit(id: string) {
    if (visited.has(id)) return;
    if (visiting.has(id)) return;
    visiting.add(id);
    const item = byId.get(id);
    if (item) for (const dep of item.dependencies) visit(dep);
    visiting.delete(id);
    visited.add(id);
    order.push(id);
  }

  for (const item of [...assignments].sort((a, b) => b.priority - a.priority)) {
    visit(item.id);
  }
  return order;
}