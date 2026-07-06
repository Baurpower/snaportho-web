/**
 * Standard agent lifecycle base class.
 *
 * Receive Work → Validate Inputs → Execute → Generate Proposals →
 * Self Validate → Compute Confidence → Return Structured Output
 */

import type {
  AgentCapability,
  AgentFailure,
  AgentIdentity,
  AgentInputBundle,
  AgentResult,
  AuditTrail,
  KnowledgeFactoryAgent,
  WorkAssignment,
} from "./contract.ts";
import { scoreProposalConfidence } from "./confidence.ts";
import { validateRequiredInputs } from "./validation.ts";
import { wrapProposals } from "./proposal-contract.ts";
import { buildSafetyProfile } from "./safety.ts";
import { FRAMEWORK_CONTRACT_VERSION } from "./versioning.ts";

export abstract class BaseKnowledgeFactoryAgent implements KnowledgeFactoryAgent {
  abstract readonly identity: AgentIdentity;
  abstract readonly capabilities: AgentCapability;

  get safetyProfile() {
    return buildSafetyProfile(this.capabilities);
  }

  abstract canHandle(assignment: Pick<WorkAssignment, "gaps" | "type">): boolean;

  protected abstract run(
    input: AgentInputBundle,
    assignment: WorkAssignment
  ): Promise<{
    proposals: import("../../../kg-automation-common.ts").ProposalRecord[];
    outputs?: Record<string, unknown>;
    warnings?: AgentFailure[];
  }>;

  validateInputs(input: AgentInputBundle, assignment: WorkAssignment) {
    return validateRequiredInputs(this.capabilities.consumes, input);
  }

  async execute(input: AgentInputBundle, assignment: WorkAssignment): Promise<AgentResult> {
    const started = Date.now();
    const startedAt = new Date().toISOString();
    const errors: AgentFailure[] = [];
    const warnings: AgentFailure[] = [];
    const auditTrail: AuditTrail = {
      agentId: this.identity.id,
      assignmentId: assignment.id,
      frameworkVersion: FRAMEWORK_CONTRACT_VERSION,
      entries: [
        { stage: "receive", timestamp: startedAt, action: "assignment_received", detail: assignment.id },
      ],
    };

    const inputValidation = this.validateInputs(input, assignment);
    if (input.evidenceContext) {
      auditTrail.entries.push({
        stage: "receive",
        timestamp: new Date().toISOString(),
        action: "evidence_packet_bound",
        detail: `${input.evidenceContext.evidencePacketId}:${input.evidenceContext.relevantEvidenceItemIds.join(",")}`,
      });
    }

    auditTrail.entries.push({
      stage: "validate_inputs",
      timestamp: new Date().toISOString(),
      action: inputValidation.passed ? "inputs_valid" : "inputs_invalid",
      detail: `${inputValidation.issues.length} issue(s)`,
    });

    if (!inputValidation.passed) {
      return this.failedResult(assignment, started, auditTrail, errors, [
        ...inputValidation.issues.map((i) => ({
          code: i.code,
          reason: i.message,
          severity: i.severity,
          recoverability: i.recoverable,
          recommendedNextAction: "Provide required inputs and retry",
        })),
      ]);
    }

    let rawProposals: import("../../../kg-automation-common.ts").ProposalRecord[] = [];
    let outputs: Record<string, unknown> = {};

    try {
      const result = await this.run(input, assignment);
      rawProposals = result.proposals;
      outputs = {
        ...(result.outputs ?? {}),
        ...(input.evidenceContext
          ? {
              evidencePacketId: input.evidenceContext.evidencePacketId,
              evidenceItemIds: input.evidenceContext.relevantEvidenceItemIds,
            }
          : {}),
      };
      if (result.warnings) warnings.push(...result.warnings);
      auditTrail.entries.push({
        stage: "execute",
        timestamp: new Date().toISOString(),
        action: "domain_work_complete",
        detail: `${rawProposals.length} proposal(s)`,
      });
    } catch (error) {
      errors.push({
        code: "EXECUTION_ERROR",
        reason: error instanceof Error ? error.message : String(error),
        severity: "error",
        recoverability: "retry",
        recommendedNextAction: "Inspect agent logs and retry with corrected inputs",
      });
      auditTrail.entries.push({
        stage: "execute",
        timestamp: new Date().toISOString(),
        action: "execution_failed",
        detail: errors[errors.length - 1]?.reason ?? "unknown",
      });
      return this.failedResult(assignment, started, auditTrail, errors, warnings);
    }

    const proposals = wrapProposals(rawProposals);
    const validationIssues = proposals.flatMap((p) => p.validation.issues);
    const escalationCount = proposals.filter(
      (p) =>
        p.reviewRecommendation.route === "ATTENDING_REVIEW" ||
        p.reviewRecommendation.route === "HUMAN_REVIEW" ||
        p.reviewRecommendation.route === "CONFLICTED"
    ).length;

    auditTrail.entries.push({
      stage: "self_validate",
      timestamp: new Date().toISOString(),
      action: "validation_complete",
      detail: `${validationIssues.length} issue(s), ${escalationCount} escalation(s)`,
    });

    const avgConfidence =
      proposals.length > 0
        ? proposals.reduce((s, p) => s + p.confidence, 0) / proposals.length
        : assignment.estimatedConfidence;

    const aggregateConfidence = scoreProposalConfidence(
      rawProposals[0] ?? {
        proposal_fingerprint: `${this.identity.id}:empty`,
        proposal_type: "create_canonical_entity",
        source_signal_type: "agent",
        source_signal_ids: [],
        specialty_id: null,
        proposed_entity_type: null,
        proposed_entity_label: null,
        proposed_existing_entity_id: null,
        proposed_subject_entity_id: null,
        proposed_predicate: null,
        proposed_object_entity_id: null,
        proposed_alias: null,
        proposed_bridge_type: null,
        confidence: avgConfidence,
        confidence_tier: "medium",
        confidence_reason: `${this.identity.id}_aggregate`,
        evidence_summary: "",
        supporting_card_count: 0,
        supporting_question_count: 0,
        supporting_curriculum_node_count: 0,
        supporting_source_count: 0,
        conflict_count: 0,
        review_status: "generated",
        reviewed_by: null,
        reviewed_at: null,
        reviewer_notes: null,
        applied_at: null,
        superseded_by: null,
        metadata: {},
        comments: null,
        is_active: true,
      }
    );

    if (input.evidenceContext && rawProposals.length > 0) {
      auditTrail.entries.push({
        stage: "return",
        timestamp: new Date().toISOString(),
        action: "evidence_cited",
        detail: input.evidenceContext.relevantEvidenceItemIds.join(","),
      });
    }

    auditTrail.entries.push({
      stage: "return",
      timestamp: new Date().toISOString(),
      action: "structured_output_ready",
      detail: `status=${errors.length ? "failed" : "completed"}`,
    });

    return {
      agentId: this.identity.id,
      assignmentId: assignment.id,
      status: errors.length
        ? "failed"
        : validationIssues.some((i) => i.severity === "error")
          ? "partial"
          : "completed",
      proposals,
      rawProposals,
      confidence: aggregateConfidence,
      validation: {
        passed: !validationIssues.some((i) => i.severity === "error" || i.severity === "critical"),
        issues: validationIssues,
        categories: proposals[0]?.validation.categories ?? {
          schema: { passed: true, issueCount: 0 },
          ontology: { passed: true, issueCount: 0 },
          relationship: { passed: true, issueCount: 0 },
          duplicate: { passed: true, issueCount: 0 },
          metadata: { passed: true, issueCount: 0 },
          provenance: { passed: true, issueCount: 0 },
          safety: { passed: true, issueCount: 0 },
          publication: { passed: true, issueCount: 0 },
        },
      },
      warnings,
      errors,
      metrics: {
        executionTimeMs: Date.now() - started,
        proposalCount: proposals.length,
        validationFailureCount: validationIssues.filter((i) => i.severity === "error").length,
        escalationCount,
        errorCount: errors.length,
        dependencyFailureCount: 0,
        confidenceDistribution: Object.fromEntries(
          proposals.map((p) => [p.proposalId, p.confidence])
        ),
        acceptanceRate:
          proposals.length > 0
            ? proposals.filter(
                (p) => p.reviewRecommendation.route === "AUTO_APPROVED_LOW_RISK"
              ).length / proposals.length
            : 0,
      },
      auditTrail,
      outputs,
    };
  }

  private failedResult(
    assignment: WorkAssignment,
    started: number,
    auditTrail: AuditTrail,
    errors: AgentFailure[],
    warnings: AgentFailure[]
  ): AgentResult {
    return {
      agentId: this.identity.id,
      assignmentId: assignment.id,
      status: "failed",
      proposals: [],
      rawProposals: [],
      confidence: {
        confidence: 0,
        breakdown: {
          evidenceQuantity: 0,
          evidenceQuality: 0,
          sourceAgreement: 0,
          ontologyCompliance: 0,
          relationshipValidity: 0,
          metadataCompleteness: 0,
          conflictScore: 0,
          safetyLevel: 0,
          rulesApplied: ["execution_failed"],
        },
        recommendedRoute: "REJECT",
        rationale: ["Agent execution failed"],
      },
      validation: { passed: false, issues: [], categories: {} as AgentResult["validation"]["categories"] },
      warnings,
      errors,
      metrics: {
        executionTimeMs: Date.now() - started,
        proposalCount: 0,
        validationFailureCount: 0,
        escalationCount: 0,
        errorCount: errors.length,
        dependencyFailureCount: 0,
        confidenceDistribution: {},
        acceptanceRate: 0,
      },
      auditTrail,
      outputs: {},
    };
  }
}