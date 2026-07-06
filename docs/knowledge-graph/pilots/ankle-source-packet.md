# Ankle Fracture — Source Packet (KF-007)

**Date:** 2026-07-05  
**Pilot:** `ankle-fracture-neighborhood`  
**Status:** Source inventory complete — proposals generated, not published  
**Machine output:** `reports/kg-pilots/ankle-proposal-packet.json`

---

## 1. Curriculum and product bridges

| Source | ID / slug | Role |
|--------|-----------|------|
| Orthobullets curriculum node | `trauma-ankle-fractures` | Import overlay + asset mapping target |
| Static Prepare topic | `ankle-fracture` | Draft claim/DP decomposition input only |
| CasePrep mapping | `ankle-fracture-orif` | Procedure bridge (9-topic static map) |
| Legacy retarget key | `retarget:trauma-ankle-fractures` | Card/question entity retarget proposal |

**Prepare topic location:** `src/lib/student-curriculum/curriculum-data.ts` (id `ankle-fracture`)  
**CasePrep mapping:** `src/lib/student-curriculum/caseprep-topic-mapping.ts`

---

## 2. Existing canonical matches

| Object | Current state |
|--------|---------------|
| `canonical_entities` slug `ankle-fracture` | **Does not exist** — hip proof seed only in DB |
| `curriculum_node_entities` bridge for `trauma-ankle-fractures` | **Retargeted** — node in 41 fully retargeted set per legacy report |
| Production semantic relationships for ankle | **None** — `canonical_relationships` sparse globally |

Proof seed entities (hip fracture cluster) are unrelated. Ankle neighborhood is **greenfield** at canonical layer.

---

## 3. Asset mappings (metadata only)

| Asset type | Count | Notes |
|------------|------:|-------|
| Anki cards → `trauma-ankle-fractures` | **12** | `reports/anki-kg-mapping-v1-report.md` |
| Orthobullets questions → node | **98** | Metadata only — **no stems/explanations** |
| `card_canonical_entity_links` | Pending | Requires ankle `canonical_entity` + migration apply |
| `question_canonical_entity_links` | Pending | Same |

---

## 4. Candidate canonical entities (19)

### Clinical

| Slug | Type | Label |
|------|------|-------|
| `ankle-fracture` | condition | Ankle Fracture |
| `weber-classification` | classification_system | Weber Classification |
| `weber-a` | classification_grade | Weber A |
| `weber-b` | classification_grade | Weber B |
| `weber-c` | classification_grade | Weber C |
| `medial-clear-space-widening` | imaging_finding | Medial Clear Space Widening |
| `mortise-stability` | biomechanics_concept | Mortise Stability |
| `ankle-orif` | procedure | Ankle ORIF |
| `ankle-orif-fixation` | fixation_method | ORIF |
| `ankle-malunion` | complication | Ankle Malunion |
| `post-traumatic-ankle-arthritis` | complication | Post-traumatic Ankle Arthritis |
| `syndesmotic-malreduction` | complication | Syndesmotic Malreduction |

### Anatomy hub

| Slug | Type | `anatomy_kind` |
|------|------|----------------|
| `ankle-ring` | anatomy_structure | composite |
| `lateral-malleolus` | anatomy_structure | bone |
| `medial-malleolus` | anatomy_structure | bone |
| `talus` | anatomy_structure | bone |
| `syndesmosis` | anatomy_structure | ligament |
| `deltoid-ligament` | anatomy_structure | ligament |
| `superficial-peroneal-nerve` | anatomy_structure | nerve |

---

## 5. Candidate relationships (29)

See `ankle-proposal-packet.json` → `relationshipProposals`. Highlights:

- Anatomy hierarchy: `part_of`, `articulates_with`, `inserts_on`
- Prerequisite: `ankle-ring` → `prerequisite_for` → `ankle-fracture`
- Diagnosis: `injured_in`, `involves_anatomy`, `at_risk_structure`
- Instability: `deltoid-ligament` / `syndesmosis` → `explains_instability` → `ankle-fracture`
- Classification: `has_classification`, `has_grade`
- Imaging: `has_imaging_finding`, `indicates_treatment`
- Treatment: `uses_fixation`, `treated_by`
- Complications: `has_complication` (×3)
- Procedure: `ankle-orif` anatomy + nerve risk

All proposals validated against `kg-relationship-registry.ts`.

---

## 6. Candidate claims — **DRAFT ONLY**

Decomposed from static Prepare `ankle-fracture`. **`content_source: generated_draft`** — NOT verified.

| draft_id | Type | L-level | Source |
|----------|------|---------|--------|
| `claim-ankle-mortise-congruity` | fact | L1 | fast.mustKnow |
| `claim-ankle-deltoid-unstable-fibula` | board_trap | L1 | deep.boardPearls |
| `claim-ankle-medial-clear-space` | imaging_point | L1 | curriculum + OB fixture pattern |
| `claim-ankle-ring-concept` | anatomy_pearl | L1 | deep.anatomy |
| `claim-ankle-isolated-fibula-trap` | cognitive_trap | L1 | fast.orSurvivalTips |
| `claim-ankle-stress-views` | fact | L2 | fast.pimpQuestions |
| `claim-ankle-syndesmosis-language` | clinical_script | L2 | fast.caseSteps |

---

## 7. Candidate decision points — **DRAFT ONLY**

| draft_id | Pattern | Attending review |
|----------|---------|------------------|
| `dp-ankle-unstable-mortise-orif` | operative_indication | **Required** |
| `dp-ankle-stable-nonoperative` | nonoperative_eligible | **Required** |

---

## 8. Schema readiness

**Option B** — migration required before DB apply. See [ankle-schema-readiness.md](./ankle-schema-readiness.md).

---

## 9. Publication policy

- ❌ Do not auto-publish
- ❌ Do not mark claims `verified`
- ❌ Do not ingest Orthobullets stems
- ✅ JSON proposal packet is safe staging artifact
- ✅ Apply to DB only after migration + human review