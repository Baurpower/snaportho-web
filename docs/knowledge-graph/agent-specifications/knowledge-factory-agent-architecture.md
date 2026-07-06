# Knowledge Factory Agent Architecture

**Status:** Canonical architectural specification  
**Framework version:** 1.0.0  
**Ontology version:** 2026-07-05  
**Pilot:** ankle-fracture

---

## Overview

The Knowledge Factory transforms bounded source evidence into mature canonical neighborhoods through a pipeline of specialized agents orchestrated by the Ontology Compiler. Agents never write to the database directly; they produce proposals that flow through merge, review, and publication gates before human-approved canonical apply.

---

## System Architecture

```mermaid
graph TB
    subgraph Sources
        OB[OrthoBullets]
        Anki[Anki Cards]
        Prep[Static Prepare]
        Expert[Expert Review]
        LLM[LLM Extraction]
    end

    subgraph Compiler["Ontology Compiler (9 Stages)"]
        NP[1. Neighborhood Planner]
        ORE[2. Ontology Requirements]
        GA[3. Gap Analyzer]
        WP[4. Work Planner]
        AO[5. Agent Orchestration]
        ME[6. Merge Engine]
        RE[7. Review Engine]
        HR[8. Human Review Packet]
        PV[9. Publication Validator]
    end

    subgraph Registry
        AR[Agent Registry]
    end

    subgraph Agents["Knowledge Factory Agents"]
        AB[Anatomy Builder]
        CEB[Clinical Entity Builder]
        RB[Relationship Builder]
        CB[Claim Builder]
        DPB[Decision Point Builder]
        MB[Metadata Builder]
        AL[Asset Linker]
        PB[Provenance Builder]
        DD[Duplicate Detector]
        CR[Conflict Resolver]
        RA[Review Assistant]
        PubV[Publication Validator Agent]
    end

    subgraph Output
        KG[(Knowledge Graph)]
        Reports[Compiler Reports]
        HRQ[Human Review Queue]
    end

    Sources --> NP
    NP --> ORE --> GA --> WP
    WP <--> AR
    AR --> AB & CEB & RB & CB & DPB & MB & AL & PB
    WP --> AO
    AO --> AB & CEB & RB & CB & DPB & MB & AL & PB
    AB & CEB & RB & CB & DPB & MB & AL & PB --> ME
    DD -.-> ME
    ME --> RE
    RE --> RA
    CR -.-> RE
    RA --> PubV
    PubV --> PV
    PV --> Reports
    RE --> HRQ
    HRQ -->|human approval| KG
```

**Dotted lines:** Agents specified but not yet registered (Duplicate Detector, Conflict Resolver).

---

## Pipeline Stages

| Stage | Component | Status | Output |
|-------|-----------|--------|--------|
| 1 | Neighborhood Planner | Completed | `ontology-neighborhood-plan.json` |
| 2 | Ontology Requirement Expansion | Completed | Connection pattern rules applied |
| 3 | Gap Analyzer | Completed | `ontology-gap-report.json` |
| 4 | Work Planner + Agent Registry | Completed | `ontology-work-plan.json`, `agent-assignment-plan.json` |
| 5 | Agent Orchestration | **Planned** | Agent `AgentResult[]` (schedule-only in v1) |
| 6 | Merge Engine | Completed | `ontology-merged-draft.json` |
| 7 | Review Engine + Review Assistant | Completed | `ontology-auto-review.json` |
| 8 | Human Review Packet | Completed | `ontology-human-review-queue.json` |
| 9 | Publication Validator | Completed | `ontology-publication-readiness.json` |

**Constraints (always):** `databaseModified: false`, `autoPublished: false`.

---

## Sequence Diagram: End-to-End Compile Pass

```mermaid
sequenceDiagram
    participant CLI as kg:compile
    participant C as Compiler
    participant NP as Neighborhood Planner
    participant GA as Gap Analyzer
    participant WP as Work Planner
    participant AR as Agent Registry
    participant Agents as Factory Agents
    participant ME as Merge Engine
    participant RE as Review Engine
    participant PV as Publication Validator

    CLI->>C: compileNeighborhood({ topic, dbBacked })
    C->>NP: buildNeighborhoodPlan(snapshot)
    NP-->>C: NeighborhoodPlan

    C->>GA: analyzeGaps(snapshot, proposals)
    GA-->>C: OntologyGap[]

    C->>WP: buildWorkPlan(topic, pilot, gaps)
    WP->>AR: registerDefaultAgents()
    WP->>AR: groupGapsByAgent(gaps)
    AR-->>WP: WorkAssignment[]
    WP-->>C: WorkPlan

    Note over C,Agents: Stage 5 — schedule only in v1
    C->>Agents: (planned) execute(assignments)

    C->>ME: mergeNeighborhoodDraft(snapshot, proposals)
    ME-->>C: MergedNeighborhoodDraft

    C->>RE: runAutoReview(proposals)
    RE-->>C: AutoReviewReport

    C->>PV: validatePublicationReadiness(...)
    PV-->>C: PublicationReadinessResult

    C-->>CLI: CompilerResult + reports
```

---

## Agent Dependency Graph

```mermaid
graph TD
    AB[anatomy-builder]
    CEB[clinical-entity-builder]
    RB[relationship-builder]
    CB[claim-builder]
    DPB[decision-point-builder]
    MB[metadata-builder]
    AL[asset-linker]
    PB[provenance-builder]
    DD[duplicate-detector]
    CR[conflict-resolver]
    RA[review-assistant]
    PV[publication-validator]

    AB --> RB
    CEB --> RB
    CEB --> AL
    RB --> CB
    RB --> DPB
    RB --> MB

    AB --> DD
    CEB --> DD
    DD -.-> CR

    AB --> RA
    CEB --> RA
    RB --> RA
    CB --> RA
    DPB --> RA
    MB --> RA
    AL --> RA
    PB --> RA

    RA --> CR
    RA --> PV
    CR -.-> PV

    PB ~~~ PB

    style DD stroke-dasharray: 5 5
    style CR stroke-dasharray: 5 5
```

**Parallel execution groups:**

| Group | Agents | Prerequisites |
|-------|--------|---------------|
| G1 | Anatomy Builder, Clinical Entity Builder, Provenance Builder | None |
| G2 | Relationship Builder | G1 entity builders |
| G3 | Claim Builder, Decision Point Builder, Metadata Builder, Asset Linker | G2 |
| G4 | Duplicate Detector | G1 (proposed) |
| G5 | Review Assistant | All gap agents |
| G6 | Conflict Resolver | G5 (proposed) |
| G7 | Publication Validator | G5 |

---

## Agent Interaction Graph

```mermaid
graph LR
    subgraph Entity Layer
        AB[Anatomy Builder]
        CEB[Clinical Entity Builder]
    end

    subgraph Graph Layer
        RB[Relationship Builder]
        MB[Metadata Builder]
    end

    subgraph Content Layer
        CB[Claim Builder]
        DPB[Decision Point Builder]
    end

    subgraph Asset Layer
        AL[Asset Linker]
        PB[Provenance Builder]
    end

    subgraph Quality Layer
        DD[Duplicate Detector]
        CR[Conflict Resolver]
    end

    subgraph Review Layer
        RA[Review Assistant]
        PV[Publication Validator]
    end

    AB -->|entities| RB
    CEB -->|entities| RB
    CEB -->|entities| AL
    RB -->|relationships| MB
    RB -->|graph context| CB
    RB -->|graph context| DPB
    AB & CEB -->|scan targets| DD
    DD -.->|flags| CR

    AB & CEB & RB & CB & DPB & MB & AL & PB -->|proposals| RA
    RA -->|review_report| PV
    CR -.->|conflict report| RA
```

---

## Data Flow

| Stage | Input | Output | Storage |
|-------|-------|--------|---------|
| Gap Analysis | Snapshot + proposals | `OntologyGap[]` | Report JSON |
| Work Planning | Gaps + registry | `WorkAssignment[]` | Report JSON |
| Agent Execute | InputBundle + assignment | `AgentResult` | In-memory |
| Merge | Snapshot + proposals | `MergedNeighborhoodDraft` | Report JSON |
| Review | Proposals | `AutoReviewReport` | Report JSON |
| Publication | Gaps + review + proposals | `PublicationReadinessResult` | Report JSON |
| Human Apply | Approved proposals | Canonical objects | Database (staging) |

---

## Registry Matching Flow

```mermaid
flowchart TD
    Gap[OntologyGap] --> Score[scoreGapMatch per agent]
    Score --> Kind{gap.kind in handlesGapKinds?}
    Kind -->|No| Reject[matches: false]
    Kind -->|Yes| Entity{missing_entity + handlesEntityTypes?}
    Entity -->|Mismatch| Reject
    Entity -->|Match/NA| Prefix{handlesOntologyRulePrefixes?}
    Prefix -->|No match| Reject
    Prefix -->|Match/NA| Fallback{isGenericFallback?}
    Fallback -->|Yes| LowSpec[specificity = 1]
    Fallback -->|No| HighSpec[specificity = base + bonuses]
    LowSpec --> Sort[Sort by specificity DESC]
    HighSpec --> Sort
    Sort --> Winner[resolveForGap → candidates0]
```

---

## Review Flow

```mermaid
flowchart TD
    Proposal[ProposalRecord] --> Curator[Intelligent Curator]
    Curator --> Scores[CurationScores]
    Scores --> Classify[classifyRoute]
    Classify --> Bridge[review-bridge]
    Bridge --> Conflict{conflict_count >= 2?}
    Conflict -->|Yes| CONFLICTED[CONFLICTED]
    Conflict -->|No| Route{Route}
    Route --> AUTO[AUTO_APPROVED_LOW_RISK]
    Route --> REVISE[AUTO_REVISED]
    Route --> HUMAN[HUMAN_REVIEW]
    Route --> ATT[ATTENDING_REVIEW]
    Route --> REJ[REJECT]
    AUTO & REVISE & HUMAN & ATT & CONFLICTED & REJ --> Envelope[ProposalEnvelope]
    Envelope --> Queue{Human needed?}
    Queue -->|Yes| HRQ[Human Review Queue]
    Queue -->|No| Apply[Auto-apply path]
```

---

## Report Artifacts

| Report | Producer | Content |
|--------|----------|---------|
| `ontology-compiler-plan.json` | Compiler | Full 9-stage plan |
| `ontology-gap-report.json` | Gap Analyzer | All gaps |
| `ontology-work-plan.json` | Work Planner | Work items + execution order |
| `agent-assignment-plan.json` | Agent Reports | Capability-matched assignments |
| `unmet-agent-capabilities.json` | Agent Registry | Gaps with no agent |
| `reviewer-burden-estimate.md` | Agent Reports | Human review load |
| `agent-contract-summary.md` | Agent Reports | Factory status summary |
| `ontology-merged-draft.json` | Merge Engine | Merged neighborhood |
| `ontology-auto-review.json` | Review Engine | Per-proposal decisions |
| `ontology-publication-readiness.json` | Publication Validator | Maturity + blockers |
| `ontology-human-review-queue.json` | Review Packet Generator | Escalation items |

---

## Maturity Progression

```mermaid
graph LR
    L0[L0 Source] --> L1[L1 Identity]
    L1 --> L2[L2 Core Rels]
    L2 --> L3[L3 Claims]
    L3 --> L4[L4 DPs]
    L4 --> L5[L5 Complete]
    L5 --> L6[L6 Expert Reviewed]
    L6 --> L7[L7 Production]

    L1 -.- AB & CEB
    L2 -.- RB
    L3 -.- CB & AL
    L4 -.- DPB
    L5 -.- MB
    L6 -.- RA
    L7 -.- PV
```

---

## Safety Architecture

| Gate | Enforcer | Rule |
|------|----------|------|
| No auto-verify | All content agents | `verified: false` always |
| No draft leak | Validation framework | `DRAFT_LEAK` critical |
| Attending gate | Review framework | DPs → `ATTENDING_REVIEW` |
| High-risk predicates | Relationship Builder + Curator | Escalation patterns |
| No auto-publish | Compiler constraints | `autoPublished: false` |
| No DB writes in compile | Compiler constraints | `databaseModified: false` |
| Staging guard | kg-staging-guard | Production blocked |

---

## Implementation Status

| Agent | Registered | Full Implementation |
|-------|------------|---------------------|
| anatomy-builder | Yes | Stub (scheduling only) |
| clinical-entity-builder | Yes | Stub |
| relationship-builder | Yes | Reference (filters proposals) |
| claim-builder | Yes | Stub |
| decision-point-builder | Yes | Stub |
| metadata-builder | Yes | Reference (filters proposals) |
| asset-linker | Yes | Stub |
| provenance-builder | Yes | Stub |
| duplicate-detector | **No** | Specified only |
| conflict-resolver | **No** | Specified only |
| review-assistant | Yes | Reference (wraps curator) |
| publication-validator | Yes | Reference (wraps validator) |

---

## Architectural Gaps (Explicit)

1. **Stage 5 not wired** — Agents scheduled but `execute()` not called in compile pass
2. **Gap-stub agents** — 6 of 8 content agents filter existing proposals only
3. **Duplicate Detector unregistered** — No dedup in pipeline
4. **Conflict Resolver unregistered** — `CONFLICTED` route exists but no dedicated agent
5. **Quality Scorer undeclared** — `quality_scoring` work type has no agent
6. **LLM layer unspecified** — Optional enhancement mentioned in curator header only
7. **Single topic** — Only `ankle-fracture` registered in compiler
8. **Input wiring incomplete** — `merged_neighborhood_draft`, `auto_review_report` not passed to agents

---

## Related Documents

### Framework specifications
- `01-agent-overview.md` through `10-agent-versioning.md`

### Agent specifications
- `01-anatomy-builder.md` through `12-publication-validator.md`

### Planning documents
- `../kg-knowledge-factory-build-plan.md`
- `../kg-orthopaedic-education-ontology-plan-2026-07-05.md`
- `../canonical-knowledge-object-specification.md`
- `../anatomy-ontology-plan.md`
- `../kg-excellence-roadmap-2026-07-05.md`

### Implementation
- `scripts/lib/education/kg-agent-framework/`
- `scripts/lib/education/kg-compiler/`
- `scripts/lib/education/kg-factory/intelligent-curator.ts`