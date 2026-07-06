# Agent Registry Specification

**Status:** Canonical architectural specification  
**Implementation:** `scripts/lib/education/kg-agent-framework/registry.ts`, `matching.ts`

---

## Purpose

The Agent Registry is the **capability discovery layer** for the Ontology Compiler. The compiler never hardcodes agent names. It queries the registry to:

1. Match ontology gaps to capable agents
2. Build `WorkAssignment` objects with correct dependencies
3. Report unmet capabilities
4. Discover registered agent manifests for planning reports

---

## Registration

### Registering an Agent

```typescript
registry.register(agent: KnowledgeFactoryAgent): void
```

**Rules:**
- `agent.identity.id` must be unique; duplicate registration throws
- Registration is idempotent per process via `registerDefaultAgents()` singleton guard
- Agents are registered at compiler/work-planner startup

### Default Registered Agents (v1.0.0)

| Agent ID | Gap kinds | Specialization |
|----------|-----------|----------------|
| `anatomy-builder` | `missing_entity` | `anatomy_structure`, prefix `anatomy.` |
| `clinical-entity-builder` | `missing_entity` | Generic fallback |
| `relationship-builder` | `missing_relationship` | — |
| `claim-builder` | `missing_claim` | — |
| `decision-point-builder` | `missing_decision_point` | — |
| `metadata-builder` | `missing_metadata` | — |
| `asset-linker` | `missing_asset_link` | — |
| `provenance-builder` | `missing_provenance` | — |
| `review-assistant` | (work type `review`) | — |
| `publication-validator` | (work type `publication_validation`) | — |

**Not yet registered (specified only):** `duplicate-detector`, `conflict-resolver`, `quality-scorer`

---

## Agent Discovery

### `discoverCapabilities()`

Returns a flat manifest for every registered agent:

```
id, name, version, supportedOntologyVersion,
produces, consumes, requires,
handlesGapKinds, handlesEntityTypes, handlesOntologyRulePrefixes,
proposalTypes, isGenericFallback, autoApprovalPatterns, escalationPatterns
```

Emitted in `ontology-work-plan.json` as `registryDiscovery` and `agent-assignment-plan.json`.

### `resolveForWorkType(type)`

Finds agents for non-gap work:

| WorkAssignmentType | Agent |
|--------------------|-------|
| `review` | `review-assistant` |
| `publication_validation` | `publication-validator` |
| `quality_scoring` | (not registered) |
| `merge` | (not registered) |

Uses `agent.canHandle({ type, gaps: [] })`.

---

## Capability Matching

### Algorithm: `scoreGapMatch(capabilities, gap)`

Evaluated in order. First failing check returns `matches: false`.

#### Step 1: Gap kind match

```
capabilities.handlesGapKinds must include gap.kind
```

Failure reason: `gap_kind_mismatch`

#### Step 2: Entity type filter (missing_entity only)

If agent declares `handlesEntityTypes` and `gap.entityType` is set:

```
gap.entityType must be in handlesEntityTypes
```

Failure reason: `entity_type_mismatch:{entityType}`  
Success adds specificity: **+100**

#### Step 3: Prefix filter (opt-in only)

If agent declares `handlesOntologyRulePrefixes`:

```
gap.ontologyRule must start with at least one declared prefix
```

Failure reason: `prefix_mismatch:{ontologyRule}`  
Success adds specificity: **+200**

**Critical rule:** Agents with prefix declarations that do **not** match are rejected entirely. They do not fall through to generic matching within the same agent.

#### Step 4: Base specificity

Gap kind match adds specificity: **+10**

#### Step 5: Generic fallback penalty

If `isGenericFallback: true`, specificity is forced to **1** regardless of other bonuses.

### Specificity Constants

| Constant | Value |
|----------|-------|
| `GAP_KIND_BASE_SPECIFICITY` | 10 |
| `ENTITY_TYPE_SPECIFICITY` | 100 |
| `PREFIX_SPECIFICITY` | 200 |
| `GENERIC_FALLBACK_SPECIFICITY` | 1 |

---

## Priority and Winner Selection

### `resolveCandidatesForGap(gap)`

1. Score all registered agents via `scoreGapMatch`
2. Filter to `matches: true`
3. Sort by specificity descending
4. Return ordered candidate list

### `resolveForGap(gap)`

Returns `candidates[0]?.agent` — highest specificity wins.

### Tie-breaking

When specificity is equal, registration order determines winner. Implementations should avoid ambiguous ties by ensuring unique specificity profiles.

---

## Fallback Rules

| Rule | Behavior |
|------|----------|
| Specialized agent exists | Specialized agent wins |
| No specialized agent | Generic fallback (`isGenericFallback: true`) wins |
| No agent matches | Gap appears in `unmet-agent-capabilities.json` |
| Prefix agent, wrong prefix | Agent rejected; next candidate evaluated |
| Relationship agent | Never matches `missing_claim`, `missing_entity`, `missing_metadata` (different gap kinds) |

### False-positive prevention (verified by tests)

| Scenario | Correct agent | Incorrect agent (blocked) |
|----------|---------------|---------------------------|
| `missing_relationship` gap | `relationship-builder` | `anatomy-builder` |
| `missing_claim` gap | `claim-builder` | `relationship-builder` |
| `missing_entity` (condition) | `clinical-entity-builder` | `metadata-builder` |
| `missing_entity` (anatomy, `anatomy.` rule) | `anatomy-builder` | `clinical-entity-builder` |
| `missing_metadata` gap | `metadata-builder` | `clinical-entity-builder` |

---

## Dependency Ordering

### Agent-level dependencies (`capabilities.requires`)

Declared as agent IDs. Work planner converts to work item IDs:

```
requires: ["relationship-builder"] → dependencies: ["work-relationship-builder"]
```

### Default dependency graph

```
anatomy-builder ──┐
                  ├──→ relationship-builder ──→ claim-builder
clinical-entity-builder ──┘                  ├──→ decision-point-builder
                                             └──→ metadata-builder

clinical-entity-builder ──→ asset-linker

review-assistant ──→ publication-validator
(all gap agents) ──→ review-assistant
```

### Topological sort

`topologicalSortAssignments()` visits dependencies first, then sorts by priority descending.

**Priority score:** `{ critical: 100, high: 75, medium: 50, low: 25 }[gap.priority] + gap.maturityImpact * 100`

---

## Grouping Gaps by Agent

### `groupGapsByAgent(gaps)`

For each gap, calls `resolveForGap`. Groups gaps under winning agent ID.

Produces one `WorkAssignment` per agent with:
- Combined `gapIds` and `gaps`
- Max priority across gaps
- Rolled-up `requiredReviewer` (attending > clinical_expert > none)

---

## Unmet Capabilities

### `resolveUnmetGaps(gaps)`

Returns gaps where `resolveCandidatesForGap` returns empty array.

Reported in `unmet-agent-capabilities.json` with:
- Gap details
- `attemptedAgents` — agents that handle the gap kind but failed specialization filters

---

## Failure Handling

| Failure | Behavior |
|---------|----------|
| No agent for gap | Gap in unmet report; no work item created |
| Agent execution fails | `AgentResult.status: "failed"`; gap remains in next compile pass |
| Agent returns partial | Proposals usable; validation errors logged |
| Dependency agent failed | Downstream agent should not execute (orchestration TBD) |
| Duplicate agent ID on register | Throw immediately |

---

## Registry API Summary

| Method | Returns | Use |
|--------|---------|-----|
| `register(agent)` | void | Bootstrap |
| `get(id)` | `KnowledgeFactoryAgent?` | Lookup |
| `list()` | `KnowledgeFactoryAgent[]` | Inventory |
| `resolveCandidatesForGap(gap)` | `GapResolutionCandidate[]` | Debugging, tests |
| `resolveForGap(gap)` | `KnowledgeFactoryAgent?` | Work planning |
| `resolveUnmetGaps(gaps)` | `OntologyGap[]` | Unmet report |
| `groupGapsByAgent(gaps)` | `Map<agentId, {agent, gaps}>` | Assignment builder |
| `resolveForWorkType(type)` | `KnowledgeFactoryAgent?` | Review/pub agents |
| `discoverCapabilities()` | Capability manifest[] | Reports |

---

## Related Documents

- `02-agent-contract.md` — `AgentCapability` type
- `08-agent-interactions.md` — How matched agents interact
- Per-agent specs in this directory