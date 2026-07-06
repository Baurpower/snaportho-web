# Agent Observability Specification

**Status:** Canonical architectural specification  
**Implementation:** `AgentMetrics`, `AuditTrail`, `agent-reports.ts`

---

## Purpose

Every agent execution must be observable. Metrics, audit trails, and reports enable monitoring of factory health, review burden, and quality trends without inspecting raw proposals.

---

## Per-Execution Metrics (AgentMetrics)

Returned on every `AgentResult`:

| Metric | Type | Description |
|--------|------|-------------|
| `executionTimeMs` | number | Wall-clock milliseconds from receive to return |
| `proposalCount` | number | Proposals generated in this execution |
| `validationFailureCount` | number | Validation issues with severity `error` |
| `escalationCount` | number | Proposals routed to ATTENDING_REVIEW, HUMAN_REVIEW, or CONFLICTED |
| `errorCount` | number | Execution errors |
| `dependencyFailureCount` | number | Upstream dependency failures (reserved; currently 0) |
| `confidenceDistribution` | `Record<string, number>` | Map of proposalId → confidence |
| `acceptanceRate` | number | Fraction of proposals with route `AUTO_APPROVED_LOW_RISK` |

### Derived metrics

| Derived | Formula |
|---------|---------|
| Escalation rate | `escalationCount / proposalCount` |
| Error rate | `errorCount / 1` (per execution) |
| Validation failure rate | `validationFailureCount / proposalCount` |
| Throughput | `proposalCount / executionTimeMs` |

---

## Audit Trail (AuditTrail)

Immutable per-execution log:

| Field | Description |
|-------|-------------|
| `agentId` | Executing agent |
| `assignmentId` | Work assignment |
| `frameworkVersion` | Contract version at execution |
| `entries[]` | Ordered lifecycle events |

### Standard audit stages

| Stage | Actions |
|-------|---------|
| `receive` | `assignment_received` |
| `validate_inputs` | `inputs_valid`, `inputs_invalid` |
| `execute` | `domain_work_complete`, `execution_failed` |
| `self_validate` | `validation_complete` |
| `return` | `structured_output_ready` |

Agents may add custom entries in `run()` via future extension; v1 framework entries only.

---

## Compiler-Level Reports

### agent-assignment-plan.json

Per-topic agent assignment manifest:

| Field | Use |
|-------|-----|
| `assignments[].agentId` | Which agent handles which gaps |
| `assignments[].gapCount` | Load per agent |
| `assignments[].matchReasons` | Why agent was selected |
| `executionOrder` | Planned execution sequence |
| `registryAgentCount` | Total registered agents |

### unmet-agent-capabilities.json

| Field | Use |
|-------|-----|
| `unmetCount` | Gaps with no agent |
| `unmetGaps[]` | Gap details + attempted agents |
| `registeredCapabilities[]` | Full capability manifest |

### reviewer-burden-estimate.md

| Metric | Description |
|--------|-------------|
| Human review rate | % requiring curator or attending |
| Auto-approved rate | % auto-approved |
| Attending review items | Count |
| Curator review items | Count |
| Burden band | low / medium / high |

### agent-contract-summary.md

High-level factory status per topic.

---

## Review Burden Metrics

From `AutoReviewReport`:

| Metric | Source |
|--------|--------|
| `humanReviewPercent` | SAFE_REVIEW + EXPERT_REVIEW / total |
| `autoApprovedPercent` | AUTO_APPROVE / total |
| `summary.AUTO_APPROVE` | Count |
| `summary.SAFE_REVIEW` | Count |
| `summary.EXPERT_REVIEW` | Count |
| `summary.REJECT` | Count |

Burden formula:

```
attendingItems * 3 + curatorItems * 1 + conflicted * 2
```

---

## Publication Metrics

From `PublicationReadinessResult`:

| Metric | Description |
|--------|-------------|
| `currentLevel` | Neighborhood maturity level |
| `requiredLevel` | Target maturity |
| `ready` | Publication ready boolean |
| `blockers.length` | Blocker count |
| `estimatedEffort.humanReviewItems` | Human review queue size |
| `estimatedEffort.attendingReviewItems` | Attending queue size |
| `estimatedEffort.effortBand` | low / medium / high |
| `dimensionScores` | Per-dimension maturity (clinical, relationship, educational, reasoning, anatomical, review, graph, asset) |

---

## Coverage Metrics

Per neighborhood (from gap analyzer + work plan):

| Metric | Description |
|--------|-------------|
| Gaps identified | `gaps.length` |
| Gaps assigned | Sum of assignment gapCounts |
| Gaps unmet | `unmetCount` |
| Agent coverage | `assigned / total` |
| Gap kinds covered | Unique kinds in assignments |

---

## Quality Trends (Target Observability)

Not yet implemented as automated dashboards. Specified for future monitoring:

| Trend | Signal |
|-------|--------|
| Acceptance rate declining | More escalations over time |
| Confidence distribution shift | Systematic quality change |
| Validation failure spike | Ontology or schema regression |
| Unmet gaps increasing | Missing agent capabilities |
| Review burden increasing | More human review needed |
| Maturity stall | Level not progressing across compile passes |

---

## Error Rate Tracking

| Error type | Source | Severity |
|------------|--------|----------|
| `EXECUTION_ERROR` | Agent run() exception | error |
| `MISSING_INPUT` | Input validation | error |
| `ONTOLOGY_VIOLATION` | Proposal validation | error |
| `DRAFT_LEAK` | Publication validation | critical |
| `DUPLICATE_FINGERPRINT` | Batch validation | error |

---

## Escalation Rate

```
escalationCount / proposalCount per agent per execution
```

High escalation agents (Claim Builder, Decision Point Builder) are expected to have high rates. Low escalation on Relationship Builder for anatomy predicates is expected.

---

## Logging Requirements for Agent Implementations

When implementing a full (non-stub) agent, log:

1. Assignment ID and gap IDs at start
2. Evidence sources consulted
3. Proposals generated (fingerprints only, not full content in production logs)
4. Validation issue codes
5. Execution time
6. Status (completed/partial/failed)

Do not log PHI or full clinical content in production observability streams.

---

## Related Documents

- `02-agent-contract.md` — `AgentMetrics`, `AuditTrail` types
- `04-agent-registry.md` — Assignment reports