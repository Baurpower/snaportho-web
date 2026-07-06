/**
 * Default safety profiles for factory agents.
 */

import type { ProposalType } from "../../../kg-automation-common.ts";
import type { AgentCapability, AgentSafetyProfile } from "./contract.ts";

const ATTENDING_GATED: ProposalType[] = ["propose_decision_point"];

export function buildSafetyProfile(
  capabilities: AgentCapability,
  overrides?: Partial<AgentSafetyProfile>
): AgentSafetyProfile {
  return {
    maxAutoApprovalConfidence: capabilities.confidenceRange.max,
    attendingGatedProposalTypes: ATTENDING_GATED,
    blockedVerifiedDrafts: true,
    maxProposalsPerAssignment: 200,
    requiresHumanReviewAboveSafety: 0.5,
    escalationPatterns: capabilities.escalationPatterns ?? [],
    autoApprovalPatterns: capabilities.autoApprovalPatterns ?? [],
    ...overrides,
  };
}