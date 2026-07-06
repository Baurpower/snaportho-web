/**
 * Agent Registry — capability discovery for the Ontology Compiler.
 * Compiler never hardcodes agent names; it queries this registry.
 */

import type { GapKind, OntologyGap } from "../kg-compiler/types.ts";
import type { KnowledgeFactoryAgent, WorkAssignment, WorkAssignmentType } from "./contract.ts";
import { compareGapMatchSpecificity, scoreGapMatch } from "./matching.ts";

export type GapResolutionCandidate = {
  agent: KnowledgeFactoryAgent;
  specificity: number;
  reasons: string[];
};

export class AgentRegistry {
  private agents = new Map<string, KnowledgeFactoryAgent>();

  register(agent: KnowledgeFactoryAgent): void {
    if (this.agents.has(agent.identity.id)) {
      throw new Error(`Agent already registered: ${agent.identity.id}`);
    }
    this.agents.set(agent.identity.id, agent);
  }

  get(id: string): KnowledgeFactoryAgent | undefined {
    return this.agents.get(id);
  }

  list(): KnowledgeFactoryAgent[] {
    return [...this.agents.values()];
  }

  /** Score all agents that can handle a gap; used by tests and discovery. */
  resolveCandidatesForGap(gap: OntologyGap): GapResolutionCandidate[] {
    const candidates: GapResolutionCandidate[] = [];

    for (const agent of this.list()) {
      const result = scoreGapMatch(agent.capabilities, gap);
      if (!result.matches) continue;
      candidates.push({
        agent,
        specificity: result.specificity,
        reasons: result.reasons,
      });
    }

    return candidates.sort((a, b) => compareGapMatchSpecificity(a.specificity, b.specificity));
  }

  /** Find the best agent for a specific ontology gap. */
  resolveForGap(gap: OntologyGap): KnowledgeFactoryAgent | undefined {
    const candidates = this.resolveCandidatesForGap(gap);
    return candidates[0]?.agent;
  }

  /** Gaps with no registered agent capability. */
  resolveUnmetGaps(gaps: OntologyGap[]): OntologyGap[] {
    return gaps.filter((gap) => this.resolveCandidatesForGap(gap).length === 0);
  }

  /** Group gaps by resolving agent from registry. */
  groupGapsByAgent(
    gaps: OntologyGap[]
  ): Map<string, { agent: KnowledgeFactoryAgent; gaps: OntologyGap[] }> {
    const grouped = new Map<string, { agent: KnowledgeFactoryAgent; gaps: OntologyGap[] }>();

    for (const gap of gaps) {
      const agent = this.resolveForGap(gap);
      if (!agent) continue;
      const existing = grouped.get(agent.identity.id);
      if (existing) {
        existing.gaps.push(gap);
      } else {
        grouped.set(agent.identity.id, { agent, gaps: [gap] });
      }
    }

    return grouped;
  }

  /** Find agents for non-gap work types (review, publication). */
  resolveForWorkType(type: WorkAssignmentType): KnowledgeFactoryAgent | undefined {
    return this.list().find((agent) => agent.canHandle({ type, gaps: [] }));
  }

  discoverCapabilities(): Array<{
    id: string;
    name: string;
    version: string;
    supportedOntologyVersion: string;
    produces: string[];
    consumes: string[];
    requires: string[];
    handlesGapKinds: GapKind[];
    handlesEntityTypes?: string[];
    handlesOntologyRulePrefixes?: string[];
    proposalTypes: string[];
    isGenericFallback?: boolean;
    autoApprovalPatterns?: string[];
    escalationPatterns?: string[];
  }> {
    return this.list().map((a) => ({
      id: a.identity.id,
      name: a.identity.name,
      version: a.identity.version,
      supportedOntologyVersion: a.identity.supportedOntologyVersion,
      produces: a.capabilities.produces,
      consumes: a.capabilities.consumes,
      requires: a.capabilities.requires,
      handlesGapKinds: a.capabilities.handlesGapKinds,
      handlesEntityTypes: a.capabilities.handlesEntityTypes,
      handlesOntologyRulePrefixes: a.capabilities.handlesOntologyRulePrefixes,
      proposalTypes: a.capabilities.proposalTypes,
      isGenericFallback: a.capabilities.isGenericFallback,
      autoApprovalPatterns: a.capabilities.autoApprovalPatterns,
      escalationPatterns: a.capabilities.escalationPatterns,
    }));
  }
}

let singleton: AgentRegistry | null = null;

export function getAgentRegistry(): AgentRegistry {
  if (!singleton) {
    singleton = new AgentRegistry();
  }
  return singleton;
}

export function resetAgentRegistry(): void {
  singleton = null;
}