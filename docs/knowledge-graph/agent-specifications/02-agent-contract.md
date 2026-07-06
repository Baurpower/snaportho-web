# Agent Contract Specification

**Status:** Canonical architectural specification  
**Framework version:** 1.0.0  
**Implementation:** `scripts/lib/education/kg-agent-framework/contract.ts`

This document is the API specification for every Knowledge Factory agent. Implementations must conform exactly to these types and semantics.

---

## KnowledgeFactoryAgent Interface

Every agent implements:

```typescript
interface KnowledgeFactoryAgent {
  readonly identity: AgentIdentity;
  readonly capabilities: AgentCapability;
  readonly safetyProfile: AgentSafetyProfile;

  canHandle(assignment: Pick<WorkAssignment, "gaps" | "type">): boolean;
  validateInputs(input: AgentInputBundle, assignment: WorkAssignment): ValidationResult;
  execute(input: AgentInputBundle, assignment: WorkAssignment): Promise<AgentResult>;
}
```

---

## AgentIdentity

Declares who the agent is and what ontology version it supports.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | Stable registry identifier (kebab-case, e.g. `relationship-builder`) |
| `name` | `string` | Yes | Human-readable display name |
| `version` | `string` | Yes | Semantic version of this agent implementation |
| `description` | `string` | Yes | One-paragraph purpose statement |
| `owner` | `string` | Yes | Team or system owning the agent (e.g. `knowledge-factory`) |
| `supportedOntologyVersion` | `string` | Yes | Ontology plan version (currently `2026-07-05`) |
| `versions` | `AgentVersionInfo` | Yes | Framework compatibility matrix |

### AgentVersionInfo

| Field | Value |
|-------|-------|
| `contractVersion` | Framework contract version (`1.0.0`) |
| `ontologyVersion` | Supported ontology version |
| `minCompilerVersion` | Minimum compiler version required |
| `proposalSchemaVersion` | Proposal envelope schema version |

---

## AgentCapability

Declares what the agent can do. Used by `AgentRegistry` for discovery and matching.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `produces` | `ProducesCapability[]` | Yes | Output artifact types |
| `consumes` | `ConsumesCapability[]` | Yes | Required input types |
| `handlesGapKinds` | `GapKind[]` | Yes | Gap kinds this agent resolves |
| `handlesEntityTypes` | `string[]` | No | Filter for `missing_entity` gaps |
| `handlesOntologyRulePrefixes` | `string[]` | No | Opt-in prefix specialization (e.g. `anatomy.`) |
| `isGenericFallback` | `boolean` | No | When true, matches only after specialized agents fail |
| `requires` | `string[]` | Yes | Agent IDs that must complete first |
| `confidenceRange` | `{ min, max }` | Yes | Typical confidence band for outputs |
| `autoApprovalPatterns` | `string[]` | No | Predicates/patterns eligible for auto-approval |
| `escalationPatterns` | `string[]` | No | Predicates/patterns that always escalate |
| `validationCategories` | `ValidationCategory[]` | Yes | Categories this agent self-validates |
| `proposalTypes` | `ProposalType[]` | Yes | Proposal types this agent may emit |

### ProducesCapability

```
entities | relationships | claims | decision_points | metadata | provenance |
asset_links | review_report | publication_report | quality_metrics
```

### ConsumesCapability

```
neighborhood_snapshot | ontology_requirements | evidence_packets | work_assignment |
canonical_objects | proposal_packets | merged_neighborhood_draft | auto_review_report |
gap_report | quality_metrics
```

### GapKind

```
missing_entity | missing_relationship | missing_claim | missing_decision_point |
missing_metadata | missing_asset_link | missing_provenance
```

---

## AgentSafetyProfile

Safety limits enforced by the framework and expected agent behavior.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `maxAutoApprovalConfidence` | `number` | From `confidenceRange.max` | Upper bound for auto-approval eligibility |
| `attendingGatedProposalTypes` | `ProposalType[]` | `[propose_decision_point]` | Types that never auto-approve |
| `blockedVerifiedDrafts` | `boolean` | `true` | Reject proposals marked verified before review |
| `maxProposalsPerAssignment` | `number` | `200` | Maximum proposals per execution |
| `requiresHumanReviewAboveSafety` | `number` | `0.5` | Safety score threshold for human review |
| `escalationPatterns` | `string[]` | From capabilities | Copied from capability declaration |
| `autoApprovalPatterns` | `string[]` | From capabilities | Copied from capability declaration |

---

## AgentInputBundle

All inputs an agent may receive.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `neighborhood` | `NeighborhoodSnapshot` | Yes | Current neighborhood state (entities, relationships, claims, DPs) |
| `ontologyRequirements` | `OntologyRequirementsContext` | No | CKO spec §8–§9 connection pattern requirements |
| `evidencePackets` | `EvidencePacket[]` | No | Source evidence bundles |
| `existingProposals` | `ProposalRecord[]` | No | Prior proposal packets |
| `gaps` | `OntologyGap[]` | No | Full gap report for context |
| `compiler` | `CompilerContext` | Yes | Compiler metadata |

### EvidencePacket

| Field | Description |
|-------|-------------|
| `packetId` | Unique packet identifier |
| `sourceType` | Source classification (anki, orthobullets, prepare_static, expert) |
| `sourceIds` | Referenced source object IDs |
| `summary` | Human-readable evidence summary |
| `quality` | Source quality score 0–1 |

---

## WorkAssignment

Compiler-produced work unit assigned to exactly one agent.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Work item ID (e.g. `work-relationship-builder`) |
| `type` | `WorkAssignmentType` | `gap_resolution`, `review`, `publication_validation`, `quality_scoring`, `merge` |
| `priority` | `number` | Higher = earlier in topological sort |
| `dependencies` | `string[]` | Work item IDs that must complete first |
| `requiredInputs` | `ConsumesCapability[]` | Inputs agent must validate |
| `requiredOutputs` | `ProducesCapability[]` | Expected output types |
| `estimatedComplexity` | `"low" \| "medium" \| "high"` | Complexity estimate |
| `estimatedConfidence` | `number` | Expected confidence for this batch |
| `ontologyReferences` | `string[]` | Ontology rules addressed |
| `validationRules` | `string[]` | Validation rule IDs (e.g. `ontology_valid`) |
| `requiredReviewer` | `RequiredReviewer` | `none`, `curator`, `clinical_expert`, `attending` |
| `publicationImpact` | `number` | 0–1 impact on publication readiness |
| `gapIds` | `string[]` | Gap IDs assigned to this work |
| `gaps` | `OntologyGap[]` | Full gap objects |
| `assignedAgentId` | `string` | Registry agent ID |

---

## ProposalEnvelope

Standard wrapper over every `ProposalRecord`. This is the canonical output format.

| Field | Type | Description |
|-------|------|-------------|
| `schemaVersion` | `string` | Envelope schema version (`1.0.0`) |
| `proposalId` | `string` | Same as `proposal.proposal_fingerprint` |
| `proposal` | `ProposalRecord` | Raw proposal record |
| `target` | `{ objectType, label, slug?, predicate? }` | What this proposal creates/modifies |
| `supportingEvidence` | `{ summary, sourceIds, cardCount, questionCount }` | Evidence backing |
| `confidence` | `number` | Composite confidence 0–1 |
| `confidenceExplanation` | `string[]` | Human-readable confidence rationale |
| `confidenceBreakdown` | `ConfidenceBreakdown` | Dimensional scores |
| `provenance` | `{ sourceSignalType, sourceSignalIds, evidenceSummary }` | Source provenance |
| `reviewRecommendation` | `ReviewRecommendation` | Routing recommendation |
| `validation` | `ValidationResult` | Self-validation outcome |
| `ontologyCompliance` | `number` | Ontology compliance score |
| `duplicateProbability` | `number` | Duplicate risk 0–1 |
| `conflictScore` | `number` | Conflict risk 0–1 |
| `publicationEligible` | `boolean` | Whether eligible for auto-publication path |

---

## ConfidenceBreakdown

Eight explainable dimensions. Every score must be traceable to a rule.

| Field | Range | Description |
|-------|-------|-------------|
| `evidenceQuantity` | 0–1 | Volume of supporting cards/questions |
| `evidenceQuality` | 0–1 | Quality of evidence sources |
| `sourceAgreement` | 0–1 | Agreement across sources (penalized by conflicts) |
| `ontologyCompliance` | 0–1 | Conformance to ontology rules and registry |
| `relationshipValidity` | 0–1 | Triple validity for relationship proposals |
| `metadataCompleteness` | 0–1 | Presence of required metadata fields |
| `conflictScore` | 0–1 | Conflict severity (higher = worse) |
| `safetyLevel` | 0–1 | Safety criticality (higher = more dangerous) |
| `rulesApplied` | `string[]` | Rule tags that fired during scoring |

---

## ReviewRecommendation

Per-proposal review routing. Must include all fields for auditability.

| Field | Type | Description |
|-------|------|-------------|
| `route` | `ReviewRoute` | Recommended review route |
| `confidence` | `number` | Composite confidence |
| `safetyScore` | `number` | Safety dimension |
| `evidenceScore` | `number` | Evidence quality dimension |
| `ontologyComplianceScore` | `number` | Ontology compliance |
| `duplicateRisk` | `number` | Duplicate probability |
| `conflictRisk` | `number` | Conflict probability |
| `reason` | `string` | Single-sentence routing reason |
| `rationale` | `string[]` | Full rule-derived rationale |
| `requiredReviewerRole` | `RequiredReviewer` | Human reviewer required |

### ReviewRoute

```
AUTO_APPROVED_LOW_RISK | AUTO_REVISED | HUMAN_REVIEW | ATTENDING_REVIEW | REJECT | CONFLICTED
```

---

## ValidationResult

| Field | Type | Description |
|-------|------|-------------|
| `passed` | `boolean` | True if no error/critical issues |
| `issues` | `ValidationIssue[]` | All validation issues |
| `categories` | `Record<ValidationCategory, { passed, issueCount }>` | Per-category summary |

### ValidationIssue

| Field | Description |
|-------|-------------|
| `category` | Validation category |
| `code` | Machine-readable code (e.g. `ONTOLOGY_VIOLATION`) |
| `message` | Human-readable message |
| `severity` | `info`, `warning`, `error`, `critical` |
| `recoverable` | `retry`, `escalate`, `skip`, `blocked` |
| `proposalFingerprint` | Optional — which proposal failed |

---

## AuditTrail

Immutable execution log returned with every `AgentResult`.

| Field | Description |
|-------|-------------|
| `agentId` | Executing agent |
| `assignmentId` | Work assignment ID |
| `frameworkVersion` | Framework version at execution time |
| `entries` | Ordered lifecycle entries |

### AuditTrailEntry

| Field | Description |
|-------|-------------|
| `stage` | Lifecycle stage (`receive`, `validate_inputs`, `execute`, `self_validate`, `return`) |
| `timestamp` | ISO 8601 timestamp |
| `action` | Action taken (e.g. `assignment_received`, `domain_work_complete`) |
| `detail` | Human-readable detail |

---

## AgentResult

Complete agent output.

| Field | Type | Description |
|-------|------|-------------|
| `agentId` | `string` | Executing agent ID |
| `assignmentId` | `string` | Work assignment ID |
| `status` | `"completed" \| "partial" \| "failed" \| "skipped"` | Execution status |
| `proposals` | `ProposalEnvelope[]` | Wrapped proposals |
| `rawProposals` | `ProposalRecord[]` | Unwrapped proposals |
| `confidence` | `ConfidenceResult` | Aggregate confidence |
| `validation` | `ValidationResult` | Aggregate validation |
| `warnings` | `AgentFailure[]` | Non-fatal issues |
| `errors` | `AgentFailure[]` | Fatal issues |
| `metrics` | `AgentMetrics` | Execution metrics |
| `auditTrail` | `AuditTrail` | Lifecycle audit log |
| `outputs` | `Record<string, unknown>` | Agent-specific outputs (immutable for consumers) |

### AgentMetrics

| Field | Description |
|-------|-------------|
| `executionTimeMs` | Wall-clock execution time |
| `proposalCount` | Proposals generated |
| `validationFailureCount` | Validation errors |
| `escalationCount` | Proposals routed to human/attending/conflicted |
| `errorCount` | Execution errors |
| `dependencyFailureCount` | Upstream dependency failures |
| `confidenceDistribution` | Per-proposal confidence map |
| `acceptanceRate` | Fraction routed to `AUTO_APPROVED_LOW_RISK` |

---

## Error Handling

### AgentFailure

| Field | Description |
|-------|-------------|
| `code` | Machine-readable error code |
| `reason` | Human-readable reason |
| `severity` | `info`, `warning`, `error`, `critical` |
| `recoverability` | `retry`, `escalate`, `skip`, `blocked` |
| `recommendedNextAction` | What to do next |
| `context` | Optional diagnostic context |

### Status semantics

| Status | When |
|--------|------|
| `completed` | All proposals valid, no errors |
| `partial` | Proposals returned but validation errors present |
| `failed` | Execution or input validation failed; no proposals |
| `skipped` | Agent chose not to execute (reserved for future use) |

Recoverability guidance:

- `retry` — Provide missing inputs and re-execute
- `escalate` — Route to human reviewer or upstream agent
- `skip` — Gap remains unmet; log and continue pipeline
- `blocked` — Hard stop; do not proceed to merge

---

## Versioning

| Artifact | Version field | Compatibility rule |
|----------|---------------|-------------------|
| Framework contract | `FRAMEWORK_CONTRACT_VERSION` | Agents declare `versions.contractVersion` |
| Ontology | `SUPPORTED_ONTOLOGY_VERSION` | Agents declare `supportedOntologyVersion` |
| Proposal envelope | `schemaVersion` on `ProposalEnvelope` | Must match `PROPOSAL_SCHEMA_VERSION` |
| Agent implementation | `identity.version` | Independent semver per agent |

Backward compatibility: agents with older `contractVersion` may run if they implement the current interface. Breaking changes require a new `FRAMEWORK_CONTRACT_VERSION`.

See `10-agent-versioning.md` for migration strategy.

---

## Capability Declaration Checklist

Before registering an agent, verify:

- [ ] `id` is unique and kebab-case
- [ ] `handlesGapKinds` lists only gap kinds this agent resolves
- [ ] `handlesEntityTypes` set only when agent is entity-type-specific
- [ ] `handlesOntologyRulePrefixes` set only when agent is prefix-specialized
- [ ] `isGenericFallback: true` only for catch-all agents (one per gap kind max)
- [ ] `requires` lists actual upstream agent IDs
- [ ] `proposalTypes` lists only types this agent emits
- [ ] `autoApprovalPatterns` and `escalationPatterns` are mutually consistent
- [ ] `safetyProfile.blockedVerifiedDrafts` is `true` for all content agents
- [ ] `canHandle()` uses `scoreGapMatch()` — not ad-hoc gap kind checks

---

## Related Documents

- `03-agent-lifecycle.md` — How the contract is exercised at runtime
- `04-agent-registry.md` — How capabilities are discovered
- `05-confidence-framework.md` — Confidence scoring rules
- `06-review-framework.md` — Review routing rules