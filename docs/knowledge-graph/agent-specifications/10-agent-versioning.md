# Agent Versioning Specification

**Status:** Canonical architectural specification  
**Implementation:** `scripts/lib/education/kg-agent-framework/versioning.ts`

---

## Purpose

Versioning ensures agents, proposals, and the ontology can evolve independently while maintaining backward compatibility and auditability.

---

## Version Artifacts

| Artifact | Constant / Field | Current Value |
|----------|------------------|---------------|
| Framework contract | `FRAMEWORK_CONTRACT_VERSION` | `1.0.0` |
| Ontology plan | `SUPPORTED_ONTOLOGY_VERSION` | `2026-07-05` |
| Minimum compiler | `MIN_COMPILER_VERSION` | `1.0.0` |
| Proposal envelope | `PROPOSAL_SCHEMA_VERSION` | `1.0.0` |
| Agent implementation | `identity.version` | Per-agent semver |
| Curator rules | `audit.curator` | `kg-factory-rules-v1` |

---

## AgentIdentity Versioning

Every agent declares:

```typescript
identity: {
  version: "1.0.0",                    // Agent implementation version
  supportedOntologyVersion: "2026-07-05",
  versions: {
    contractVersion: "1.0.0",
    ontologyVersion: "2026-07-05",
    minCompilerVersion: "1.0.0",
    proposalSchemaVersion: "1.0.0"
  }
}
```

### Semver rules for agent implementations

| Change type | Version bump | Example |
|-------------|--------------|---------|
| Bug fix, same outputs | Patch | 1.0.0 → 1.0.1 |
| New gap handling, new proposal fields | Minor | 1.0.0 → 1.1.0 |
| Breaking contract change | Major | 1.0.0 → 2.0.0 |

---

## Backward Compatibility

### Framework contract compatibility

| Rule | Description |
|------|-------------|
| Same major contract | Agents continue to work |
| New optional fields | Old agents ignore; framework provides defaults |
| New required fields | Requires contract major bump |
| New `ReviewRoute` values | Requires contract minor bump + agent update |
| Removed fields | Major bump only |

### Proposal envelope compatibility

`ProposalEnvelope.schemaVersion` must match `PROPOSAL_SCHEMA_VERSION` for the framework to wrap correctly.

Consumers (Review Engine, human review UI) must handle unknown `schemaVersion` by rejecting with clear error, not silent misparse.

### Ontology compatibility

Agents declare `supportedOntologyVersion`. If compiler runs with a newer ontology:

| Scenario | Behavior |
|----------|----------|
| Agent supports current ontology | Normal execution |
| Agent supports older ontology | Warning in audit trail; may produce non-compliant proposals |
| Agent supports newer ontology than compiler | Agent not registered or blocked |

---

## Contract Evolution Process

1. Propose change to `contract.ts` types
2. Bump `FRAMEWORK_CONTRACT_VERSION`
3. Update all registered agents' `versions.contractVersion`
4. Update specification documents in this directory
5. Add migration notes to this document
6. Run `kg:agent-contract:test` and `kg:compile:test`

### Breaking change examples

| Change | Impact |
|--------|--------|
| Add required field to `WorkAssignment` | All agents + work planner |
| Rename `ReviewRoute` value | Review bridge + curator + all specs |
| Add new `GapKind` | Gap analyzer + new/updated agents |
| Change specificity scoring | Registry matching + all agent registrations |

---

## Ontology Evolution

Ontology version `2026-07-05` aligns with:
- CKO specification
- Orthopaedic Education Ontology Plan
- Anatomy Ontology Plan
- Relationship registry generation set

### Ontology change process

1. Update ontology plan documents
2. Bump `SUPPORTED_ONTOLOGY_VERSION`
3. Update relationship registry if predicates change
4. Re-register agents with new `handlesOntologyRulePrefixes` / `handlesEntityTypes`
5. Re-run ankle pilot compile to verify gap detection still works
6. Apply DB migration if schema changes (separate from agent specs)

### Predicate additions

New predicates require:
- Entry in relationship registry with type constraints
- Classification in `autoApprovalPatterns` or `escalationPatterns` for Relationship Builder
- Update to `05-confidence-framework.md` and `06-review-framework.md`

---

## Migration Strategy

### v1.0.0 → future versions

| Component | Migration approach |
|-----------|-------------------|
| Gap-stub agents → full agents | Same `identity.id`; bump `identity.version`; no registry change |
| Add Duplicate Detector | New registration; no breaking change |
| Wire Stage 5 execution | Compiler change only; agent contract unchanged |
| LLM enhancement layer | New `ConsumesCapability` or parallel proposal path (TBD) |

### Proposal migration

Proposals in `kg_automation_proposals` table are forward-compatible via `metadata` JSON. Schema migrations use Supabase migrations, not agent changes.

### Report migration

Compiler reports include `frameworkVersion` field. Consumers should check version before parsing.

---

## Version Verification

At agent registration, the framework should verify (future enhancement):

```
agent.versions.contractVersion === FRAMEWORK_CONTRACT_VERSION
agent.versions.minCompilerVersion <= compiler.version
agent.supportedOntologyVersion === SUPPORTED_ONTOLOGY_VERSION
```

Currently enforced by convention and tests, not runtime assertion.

---

## Deprecation Policy

| Item | Deprecation period | Removal |
|------|-------------------|---------|
| `FactoryProposal` alias | Keep through v2.0.0 | Use `ProposalEnvelope` |
| `AgentCapabilities` alias | Keep through v2.0.0 | Use `AgentCapability` |
| `AgentExecutionResult` alias | Keep through v2.0.0 | Use `AgentResult` |
| Legacy `AgentFamily` labels | Keep for reports | Registry IDs are source of truth |

---

## Related Documents

- `02-agent-contract.md` — Version fields in contract types
- `01-agent-overview.md` — Framework philosophy