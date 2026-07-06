# Evidence Packet System

## Purpose

The Evidence Packet is the **standardized, read-only input bundle** for the Ontology Compiler and Knowledge Factory agents. It centralizes every source signal needed to propose, validate, and review canonical knowledge objects for a topic/neighborhood.

Evidence packets are **not canonical truth**. They are reproducible context that agents consume instead of independently fetching or guessing sources.

## What Evidence Packets Are / Are Not

| Are | Are Not |
|-----|---------|
| Read-only compiler/agent inputs | Verified medical claims |
| Auditable source manifests | Published learner-facing content |
| Deterministic when sources are stable | Database mutation operations |
| Copyright-safe metadata summaries | Full Orthobullets question text |

## Copyright Boundaries

| Source | Policy | Stored Content |
|--------|--------|----------------|
| Static Prepare (`curriculum-data.ts`) | `internal_draft_only` | Learning objectives, fast/deep templates — draft source only |
| Curriculum nodes | `reference_link_only` | Slug mappings, aliases |
| Anki | `metadata_only` | Mapping counts, deck branch hints — no card text |
| Orthobullets | `metadata_only` | Mapping counts — **no stems, answers, or explanations** |
| CasePrep | `reference_link_only` | Slug links only |
| Canonical snapshot | `spec_snapshot` | Entity/relationship counts and slug index |
| Proposals / review | `spec_snapshot` | Status distributions, fingerprints |

Output claims remain `generated_draft` until human/attending review gates pass.

## Source Hierarchy

1. **Canonical snapshot** — current neighborhood state (spec or DB read)
2. **Static Prepare** — internal draft teaching content
3. **Curriculum node mapping** — topic ↔ curriculum bridge
4. **Asset signals** — Anki / Orthobullets / CasePrep metadata
5. **Proposal history** — existing factory proposals
6. **Review history** — curation routes and review status
7. **Quality signals** — ontology gaps and safety flags

## Evidence Item Schema

Every `EvidenceItem` includes:

- `evidenceId` — stable deterministic ID
- `sourceType`, `sourceId`, `path`
- `extractionMethod`
- `copyrightPolicy`
- `confidenceHint`
- `provenanceHint`
- `label`, `summary`, `payload`, `tags`

## Collectors

| Collector | Responsibility |
|-----------|----------------|
| `static-prepare-collector` | Prepare fast/deep sections as internal draft |
| `curriculum-node-collector` | Curriculum slug + alias mapping |
| `anki-signal-collector` | Anki mapping counts (metadata only) |
| `orthobullets-metadata-collector` | OB question counts (metadata only) |
| `caseprep-link-collector` | CasePrep slug links |
| `canonical-snapshot-collector` | Neighborhood entity/relationship snapshot |
| `proposal-history-collector` | Proposal packet summary |
| `review-history-collector` | Review status distribution |
| `quality-signal-collector` | Ontology gaps + safety flags |

Collectors never mutate the database.

## CLI

```bash
npm run kg:evidence -- --topic ankle-fracture
npm run kg:evidence -- --topic ankle-fracture --db-backed --strict
```

Outputs:

```
reports/kg-evidence/<topic>/
  evidence-packet.json
  evidence-summary.md
  evidence-manifest.json
  evidence-warnings.json
```

## Compiler Integration

```bash
npm run kg:compile -- --topic ankle-fracture --use-evidence
npm run kg:compile -- --topic ankle-fracture --evidence reports/kg-evidence/ankle-fracture/evidence-packet.json
```

The compiler passes the packet to agent orchestration. Each work assignment receives `evidencePacketId` and `relevantEvidenceItemIds`. Agent audit trails record `evidence_packet_bound` and `evidence_cited`.

## Agent Evidence Citation

Agents should:

1. Read `input.evidenceContext` and `input.knowledgeEvidencePacket`
2. Never fetch additional evidence independently during compile
3. Record evidence IDs in `auditTrail` (`evidence_packet_bound`, `evidence_cited`)
4. Include `evidenceItemIds` in agent `outputs` when emitting proposals

## Provenance Mapping

| Evidence field | Maps to proposal provenance |
|----------------|----------------------------|
| `provenanceHint` | `source_signal_ids` / provenance record |
| `confidenceHint` | confidence breakdown `evidenceQuality` |
| `sourceType` | `source_signal_type` |
| `evidenceId` | audit trail + envelope supporting evidence |

## Auto-Approval Limits

Evidence alone **cannot** auto-approve:

- Decision points (attending review required)
- Emergency / safety claims
- Predicates: `must_protect_during`, `at_risk_structure`, `indicates_treatment`, `treated_by`, `uses_fixation`
- Any item without schema + safety validation pass

Publication remains blocked until review gates are satisfied regardless of evidence richness.

## Parallel Topic Buildout

Evidence packets are topic-scoped and independently buildable:

```bash
npm run kg:evidence -- --topic ankle-fracture &
npm run kg:evidence -- --topic hip-fracture &   # when registered
```

Each packet carries its own `packetId`, manifest, and warnings. Compilers can consume packets in parallel without shared mutable state.

## Tests

```bash
npm run kg:evidence:test
npm run kg:compile:test
npm run typecheck
```