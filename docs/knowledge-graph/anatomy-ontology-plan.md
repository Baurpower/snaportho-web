# SnapOrtho Anatomy Ontology Plan

**Date:** 2026-07-05  
**Status:** Planning document — no implementation  
**Scope:** How anatomy is represented as the structural backbone of the Orthopaedic Knowledge Network  
**Prerequisites:**
- [Orthopaedic Knowledge Network Vision Blueprint](./kg-orthopaedic-education-ontology-plan-2026-07-05.md)
- [Canonical Knowledge Object Specification](./canonical-knowledge-object-specification.md)  
**Audience:** Clinical curation, medical education, engineering, product

---

## 1. Executive Summary

Anatomy is not a side table in the Orthopaedic Knowledge Network. It is the **organizing infrastructure** — the highest-connectivity substrate through which diagnoses, procedures, imaging findings, exam maneuvers, complications, implants, classifications, decision points, claims, and assessment assets all connect into one traversable graph.

Without a governed anatomy ontology, orthopaedic knowledge fragments into isolated topic pages. With it, a resident evaluating ankle instability, a BroBot session about volar plating, and an OITE question about mortise widening all route through the **same anatomical neighborhood** — weighted differently, but never duplicated.

### What this document defines

| Topic | Decision |
|-------|----------|
| **Role of anatomy** | Structural backbone and graph router — not a textbook chapter |
| **Entity model** | `anatomy_structure` with `anatomy_kind`, hierarchy levels, granularity rules |
| **Relationship vocabulary** | Anatomy-to-anatomy edges + clinical-to-anatomy edges with distinct semantics |
| **Metadata** | `anatomy_role`, `relevance_reason`, and traversal weighting on every high-yield edge |
| **Completeness** | Type-specific anatomy standards for diagnoses, procedures, nerves, compartments, etc. |
| **Quality** | Coverage, precision, orphan, and overlinking metrics |
| **Buildout** | Five regional pilots: ankle, distal radius/wrist, leg compartments, hip, lumbar spine |

### What this document does not do

- No schema migrations, code changes, or ingestion pipeline implementation
- No curriculum view design or product UI specification
- No replacement of the broader network vision — this document **specializes** the backbone layer that everything else hangs on

### Core principle (from the Vision Blueprint)

> *The value of the KG is not the number of nodes. The value is the quality, density, organization, weighting, and traversability of the relationships between nodes.*

For anatomy, this means: **a smaller set of precisely modeled structures with richly weighted connections outperforms a large anatomy dictionary with shallow or undifferentiated links.**

---

## 2. Why Anatomy Is the Backbone of Orthopaedic Knowledge

Orthopaedics is anatomical medicine. Nearly every clinical question eventually resolves to **where** — which bone, which joint, which nerve, which compartment, which structure is injured, at risk, unstable, or failing.

### Anatomy is the highest-connectivity node class

In the Orthopaedic Knowledge Network, anatomical structures are reused across more relationship types than any other entity class:

```
                    ┌─────────────────┐
                    │ anatomy_structure│  ◄── HUB
                    └────────┬────────┘
         ┌──────────┼──────────┼──────────┬──────────┐
         ▼          ▼          ▼          ▼          ▼
    diagnoses   procedures   imaging     exam      implants
         │          │          │          │          │
         └──────────┴──────────┴──────────┴──────────┘
                         complications
                         classifications
                         claims / DPs
                         cards / questions
```

- **Diagnoses** break, tear, compress, or destabilize anatomy
- **Procedures** expose, instrument, and protect anatomy
- **Imaging findings** are interpretations of anatomical relationships (mortise, joint space, canal diameter)
- **Exam maneuvers** test anatomical integrity (Lachman → ACL; SLR → nerve roots)
- **Complications** damage anatomy (AVN → femoral head; nerve injury → radial nerve)
- **Implants** attach to anatomical sites
- **Classifications** often grade anatomical disruption (Weber, Garden)
- **Decision points** frequently hinge on anatomical thresholds (unstable mortise, canal compromise)
- **Claims** explain why anatomical relationships matter ("pulses unreliable in CS" → compartment anatomy)

### Anatomy is the graph router

Products enter the network from different nodes — a diagnosis in Prepare, a procedure in CasePrep, a question in OITE, a conversational entity in BroBot. Anatomy ensures **convergent traversal**:

- Enter at **ankle fracture** → traverse to syndesmosis, deltoid, malleoli
- Enter at **ORIF ankle** → traverse to the same structures via `at_risk_in` / `must_protect_during`
- Enter at **medial clear space widening** → traverse to deltoid and mortise anatomy
- Enter at **Weber B** → traverse to lateral malleolus anatomy

Without shared anatomical hubs, these are four disconnected content silos. With them, they are **one neighborhood**.

### Anatomy is prerequisite infrastructure

Regional anatomy enables clinical objects. The graph should encode this explicitly:

```
ankle ring anatomy ──prerequisite_for──► ankle fracture
anterior leg compartment ──prerequisite_for──► compartment syndrome
lumbar spinal canal ──prerequisite_for──► cauda equina syndrome
```

Foundational learning traversals run **anatomy → clinical object**. Call-readiness traversals run **clinical object → essential anatomy → structures at risk**.

### Anatomy is not a separate curriculum silo

Anatomy does not live in an "Anatomy rotation folder" that owns teaching prose. Anatomy objects are canonical entities with:

- Typed relationships to clinical objects
- Claims (`anatomy_pearl`, `red_flag`) attached as educational assertions
- Metadata weighting for context-specific surfacing

Curriculum views may sequence anatomy objects for a rotation. They reference IDs — they do not duplicate nerve courses or compartment boundaries.

### What happens without an anatomy ontology

| Failure mode | Consequence |
|--------------|-------------|
| Anatomy as prose in condition descriptions | Not traversable, not linkable, drifts per product |
| Generic region buckets ("lower extremity") | Meaningless edges, noisy traversals |
| Procedure-specific anatomy duplicates | "Median nerve in volar approach" copied per procedure instead of one nerve hub |
| Undifferentiated anatomy links | Every structure looks equally important; learners drown |
| No inbound edges to nerve/compartment hubs | Cannot traverse from anatomy entry points |

The anatomy ontology exists to prevent these failures at scale.

---

## 3. Anatomy Object Identity and Granularity Rules

Every anatomical concept is a canonical `anatomy_structure` object governed by the [Canonical Knowledge Object Specification](./canonical-knowledge-object-specification.md). Anatomy objects follow the same lifecycle, maturity model, and governance gates as all canonical objects.

### Identity requirements

Each anatomy object must have:

| Identity element | Purpose |
|------------------|---------|
| **Canonical name** | Unambiguous, attending-acceptable label |
| **Anatomy kind** | Structural category (see §5) |
| **Hierarchy level** | Region, subregion, structure, or substructure (see §4) |
| **Regional scope** | Body region for filtering and curation queues |
| **Laterality policy** | Paired, midline, or side-agnostic |
| **Aliases** | Resident names, abbreviations, eponyms, deprecated terms |

### Granularity rules

Granularity is a **graph design decision**, not a documentation habit.

#### Rule 1: Specific enough to support clinical relationships

An anatomy object must support at least one **high-yield clinical or procedural relationship** — otherwise it is too coarse or too trivial for the canonical graph.

| Too coarse ❌ | Correct ✅ | Too fine ❌ |
|--------------|-----------|-----------|
| "Hand" | "Scaphoid" | "Scaphoid waist central-third cortex" |
| "Ankle" | "Syndesmosis" | "Anterior inferior tibiofibular ligament fiber bundle 2" |
| "Leg" | "Anterior compartment" | "Tibialis anterior muscle belly distal third" |

#### Rule 2: One canonical object per clinically distinct structure

If two names refer to the **same structure** → aliases on one object.  
If two structures have **different clinical relationships** → separate objects.

- Median nerve at the wrist and median nerve in the forearm: **one nerve object** with substructure claims, unless procedural risk genuinely differs by level (then substructure objects with `part_of` edges)
- Lateral malleolus and medial malleolus: **separate objects** — different fracture patterns, different instability implications

#### Rule 3: Composite concepts become named structures when they carry relationships

"Ankle ring" is a valid anatomy object when it functions as a **mental model hub** with `prerequisite_for` edges to ankle fracture — not because it is a single tissue, but because it is an educationally and clinically meaningful composite with its own relationship neighborhood.

#### Rule 4: Regions are hierarchy containers, not clinical hubs

`region` and `subregion` levels organize curation. They are **not** substitutes for structure-level objects. "Foot and ankle" as a region container is fine. "Foot and ankle" as the only anatomy linked to ankle fracture is not.

#### Rule 5: Laterality defaults to side-agnostic unless sidedness matters

Most nerves, bones, and compartments are modeled **once** with laterality understood. Sided objects are created only when sided anatomy has distinct clinical content (e.g., asymmetric procedural approach landmarks).

### Anatomy object metadata (identity layer)

Beyond universal canonical metadata:

| Metadata | Values / purpose |
|----------|------------------|
| `anatomy_kind` | bone, joint, ligament, tendon, muscle, nerve, vessel, compartment, fascia, physis, apophysis, articular_surface, surgical_interval, safe_zone (see §5) |
| `hierarchy_level` | region \| subregion \| structure \| substructure |
| `region` | e.g., ankle, wrist, hip, lumbar_spine |
| `paired` | boolean — paired structure |
| `surgical_relevance` | none \| landmark \| danger_zone \| interval \| attachment_site |
| `pediatric_relevance` | physis/apophysis proximity flags |

### Teaching content on anatomy objects

Anatomy objects do **not** store teaching prose in their label or description fields. Teaching lives in:

- **`anatomy_pearl` claims** — high-yield facts, surface landmarks, dangerous variants
- **`red_flag` claims** — cannot-miss anatomy (e.g., MFCA, cauda equina territory)
- **Linked assets** — diagrams, illustrations, Anki cards

---

## 4. Anatomy Hierarchy: Region → Subregion → Structure → Substructure

The anatomy ontology uses a **four-level conceptual hierarchy** for organization and traversal depth control. This is not a clinical taxonomy tree — it is a **curation and display scaffold**. Clinical relationships still form a network, not a strict parent-child tree.

```
region
  └── subregion
        └── structure
              └── substructure
```

### Level definitions

| Level | Definition | Graph role | Examples |
|-------|------------|------------|----------|
| **Region** | Major body region | Curation grouping, curriculum sequencing | Lower extremity, upper extremity, spine, pelvis |
| **Subregion** | Anatomical zone within region | Bridge between curriculum and structure | Ankle, wrist, hip, knee, lumbar spine, forearm |
| **Structure** | Clinically named anatomical entity | **Primary hub nodes** — most relationships attach here | Distal radius, syndesmosis, median nerve, anterior compartment, femoral head |
| **Substructure** | Part of a structure with distinct clinical significance | Fine-grained only when relationships differ | DRUJ articular surface, femoral head subchondral region, AIN branch |

### Hierarchy relationships

Use `part_of` and `contains` to encode hierarchy:

```
lower extremity ──contains──► ankle (subregion)
ankle (subregion) ──contains──► lateral malleolus (structure)
distal radius (structure) ──part_of──► forearm (subregion)
```

**Direction convention:**
- `part_of`: child → parent (lateral malleolus `part_of` ankle subregion)
- `contains`: parent → child (ankle subregion `contains` lateral malleolus)

### Hierarchy is for organization, not traversal substitution

Products should not traverse region → subregion → structure as a **content delivery tree**. Hierarchy helps:

- Curation dashboards ("complete all ankle structures")
- Depth-limited BroBot expansion
- Curriculum view sequencing

Clinical traversals use **semantic relationships** (`injured_in`, `at_risk_in`, `innervated_by`) — not hierarchy alone.

### When to stop at structure vs. create substructure

Create a substructure object when:

- A procedure places a structure at risk at a **specific level** (median nerve at wrist vs. forearm)
- A classification grades a **subregion of a bone** (femoral neck vs. femoral head)
- An imaging finding localizes to a **named substructure** (DRUJ incongruity)

Do **not** create substructure objects for textbook minutiae without orthopaedic clinical payoff.

---

## 5. Anatomy Kinds

`anatomy_kind` classifies every `anatomy_structure` object. Kind determines **expected relationship neighborhoods**, **completeness standards**, and **default metadata templates**.

| Kind | Definition | Primary relationship patterns | Orthopaedic significance |
|------|------------|------------------------------|--------------------------|
| **bone** | Skeletal segment or named bony landmark | `articulates_with`, `part_of`, `injured_in`, `originates_from`, `inserts_on` | Fracture site, reduction target, implant attachment |
| **joint** | Articulation between bones | `articulates_with`, `explains_instability`, `crosses_joint`, `injured_in` | Stability, dislocation, arthroplasty |
| **ligament** | Connective tissue stabilizer | `connects` (via `part_of`/`adjacent_to`), `explains_instability`, `injured_in` | Instability patterns, sprains, reconstruction |
| **tendon** | Muscle-to-bone connector | `inserts_on`, `originates_from`, `injured_in`, `compressed_in` | Tears, ruptures, tenodesis |
| **muscle** | Contractile unit | `contained_in_compartment`, `originates_from`, `inserts_on` | Compartment syndrome, weakness patterns |
| **nerve** | Neural structure | `innervated_by` (inbound), `at_risk_in`, `compressed_in`, `explains_symptom` | Highest procedural risk; exam correlation |
| **vessel** | Arterial or venous structure | `supplied_by` (inbound), `at_risk_in`, `must_protect_during` | AVN, vascular injury, blood supply |
| **compartment** | Osteofascial boundary | `contains` (muscles), `contained_in_compartment` (inverse), `compressed_in` | Compartment syndrome — emergency bridge |
| **fascia** | Fascial plane or retinaculum | `adjacent_to`, `surgical_landmark_for`, `approach_interval_for` | Approach planes, release, compression |
| **physis** | Growth plate | `part_of` (bone), `injured_in`, `explains_instability` | Pediatric fractures, growth arrest |
| **apophysis** | Traction apophysis | `part_of`, `inserts_on`, `injured_in` | Avulsion injuries (Osgood-Schlatter, medial epicondyle) |
| **articular_surface** | Cartilage/subchondral region | `part_of` (bone/joint), `injured_in`, `explains_instability` | Chondral injury, arthritis, reduction quality |
| **surgical_interval** | Named anatomical plane between structures | `approach_interval_for`, `between` (via `adjacent_to`), `must_protect_during` | Approach anatomy — links to `surgical_approach` |
| **safe_zone** | Region where instrumentation is relatively safe | `surgical_landmark_for`, `must_protect_during` (inverse) | Pin placement, osteotomy corridors |

### Kind-specific hub expectations

| Kind | Hub connectivity expectation |
|------|------------------------------|
| **nerve** | High inbound `at_risk_in`, `compressed_in`, `must_protect_during` from procedures |
| **compartment** | High inbound `contained_in_compartment`; links to `compressed_in` conditions |
| **bone** | High inbound `injured_in`; outbound `articulates_with` |
| **joint** | High `explains_instability` connectivity to classifications and biomechanics |
| **vessel** | High inbound `supplied_by` for bones at AVN risk; `at_risk_in` from procedures |

---

## 6. Anatomy Relationships

Anatomy relationships fall into two families:

1. **Anatomy ↔ anatomy** — structural, spatial, and functional connections
2. **Clinical object → anatomy** — how diagnoses, procedures, and findings engage structures

Both families require metadata (§7). Both are directed.

### 6.1 Anatomy ↔ anatomy predicates

| Predicate | Subject → Object | Meaning | Example |
|-----------|------------------|---------|---------|
| `part_of` | substructure/structure → structure/subregion/region | Compositional hierarchy | Lateral malleolus `part_of` ankle |
| `contains` | region/subregion/compartment → structure | Parent holds child | Anterior compartment `contains` tibialis anterior |
| `adjacent_to` | structure ↔ structure | Spatial neighborhood | Tibia `adjacent_to` fibula at syndesmosis |
| `articulates_with` | bone/joint → bone/joint | Joint relationship | Talus `articulates_with` tibia |
| `crosses_joint` | tendon/nerve/vessel → joint | Structure crossing articulation | Peroneal tendons `crosses_joint` ankle |
| `originates_from` | muscle/tendon → bone | Origin site | Achilles `originates_from` calcaneus (insertion — use `inserts_on`) |
| `inserts_on` | tendon/ligament → bone | Attachment site | Deltoid ligament `inserts_on` medial malleolus |
| `innervated_by` | muscle/structure → nerve | Motor/sensory supply | Thenar muscles `innervated_by` median nerve |
| `supplied_by` | bone/structure → vessel | Blood supply | Femoral head `supplied_by` medial femoral circumflex artery |
| `contained_in_compartment` | muscle/structure → compartment | Compartment membership | Tibialis anterior `contained_in_compartment` anterior compartment |

**Note on `originates_from` / `inserts_on`:** Muscle origins and tendon insertions are high-yield in sports and foot/ankle. Model only when clinically tested or procedurally relevant — not exhaustive myology.

### 6.2 Clinical object → anatomy predicates

These connect the clinical network to the anatomical backbone. Several extend or specialize predicates from the [Vision Blueprint](./kg-orthopaedic-education-ontology-plan-2026-07-05.md):

| Predicate | Subject → Object | Meaning | Replaces / complements |
|-----------|------------------|---------|------------------------|
| `involves_anatomy` | condition/procedure → anatomy | General anatomical involvement | Vision Blueprint Phase 1 (broad) |
| `at_risk_structure` | condition/procedure → anatomy (nerve/vessel) | Structure specifically at risk | Vision Blueprint Phase 1 — use when risk is specific |
| `at_risk_in` | procedure/approach → anatomy | Procedural iatrogenic risk | CasePrep, approach anatomy |
| `injured_in` | condition → anatomy | Structure damaged in pathology | Fracture site, ligament tear |
| `compressed_in` | condition → anatomy (nerve) | Compression pathology | CTS, CES, compartment |
| `explains_symptom` | anatomy → clinical_sign OR condition → anatomy | Anatomical basis of presentation | Weakness, numbness, deformity |
| `explains_instability` | anatomy → condition OR ligament → joint | Structural instability mechanism | Deltoid rupture → ankle instability |
| `surgical_landmark_for` | anatomy → surgical_approach | Landmark for orientation | Gerdy's tubercle → anterolateral approach |
| `approach_interval_for` | surgical_interval → surgical_approach | Named interval for approach | Kaplan interval → volar wrist |
| `must_protect_during` | anatomy → procedure | Non-negotiable protection target | Sciatic nerve `must_protect_during` THA |
| `prerequisite_for` | anatomy → condition/procedure | Foundational anatomy before clinical topic | Ankle ring `prerequisite_for` ankle fracture |

**Predicate discipline:**

- Use `involves_anatomy` for **general** involvement (fracture → bone)
- Use `injured_in` when the structure is **specifically damaged**
- Use `at_risk_structure` / `at_risk_in` when **iatrogenic or complication risk** is the teaching point
- Use `must_protect_during` for **procedural safety** edges with highest display priority
- Do not use `involves_anatomy` as a catch-all that dilutes precision

### 6.3 Relationship to existing registry

Current `kg-relationship-registry.ts` includes `involves_anatomy`, `tested_by`, `examines`, and `prerequisite_for`. It does **not** yet include `at_risk_structure`, `contained_in_compartment`, or the anatomy-specific vocabulary in §6.1–6.2.

This plan defines the **target anatomy vocabulary**. Registry extension is an implementation ticket — not scope for this document.

### 6.4 Relationship quality standards

Every anatomy relationship must be:

| Quality dimension | Requirement |
|-------------------|-------------|
| **Directionally correct** | Subject/object orientation matches clinical assertion |
| **Granularity-matched** | Object is the right structure — not a region bucket |
| **Metadata-complete** | `anatomy_role` and `relevance_reason` populated for publication |
| **Provenance-backed** | Source or reviewer recorded |
| **Explainable** | Linked claim or curator rationale when non-obvious |

---

## 7. Anatomy Relationship Metadata

Anatomy edges without metadata are the primary cause of **anatomy overlinking** — twenty structures surfaced with equal weight when three are essential. Metadata makes anatomy traversable.

### Required metadata dimensions

| Field | Values | Purpose |
|-------|--------|---------|
| **`anatomy_role`** | `essential` \| `supporting` \| `background` \| `advanced` | How central this structure is to understanding the subject |
| **`relevance_reason`** | See enum below | Why this edge exists — drives product filters |
| **`context_relevance`** | call, clinic, or, conference, oite, off_service, board_review | When to surface |
| **`display_priority`** | Integer or tier (1 = show first) | Ordering within a traversal result set |
| **`review_status`** | unreviewed → approved | Governance gate |

### `relevance_reason` enum

| Value | When to use |
|-------|-------------|
| `diagnosis` | Structure defines or localizes the diagnosis |
| `exam` | Structure is examined or palpated |
| `imaging` | Structure appears on imaging interpretation |
| `approach` | Structure defines or borders surgical approach |
| `implant` | Structure is implant attachment or target |
| `neurovascular_risk` | Structure is nerve/vessel at risk |
| `complication` | Structure damaged in known complication |
| `classification` | Structure determines classification grade |
| `reduction` | Structure is reduction target or quality criterion |
| `instability` | Structure explains mechanical instability |
| `rehab` | Structure guides rehabilitation milestones |

### How metadata drives traversals

| Product | Typical filter |
|---------|----------------|
| **Prepare (call)** | `anatomy_role = essential` + `context_relevance` includes call + `relevance_reason` in (diagnosis, neurovascular_risk, instability) |
| **CasePrep** | `relevance_reason` in (approach, implant, neurovascular_risk) + `must_protect_during` edges |
| **BroBot** | `anatomy_role` in (essential, supporting) + high `display_priority` |
| **OITE** | `relevance_reason` in (classification, instability, imaging) + board context |
| **Foundational anatomy mode** | `anatomy_role = essential` + `prerequisite_for` chains |

### Default metadata templates by predicate

| Predicate | Default `anatomy_role` | Default `relevance_reason` |
|-----------|------------------------|---------------------------|
| `must_protect_during` | essential | neurovascular_risk |
| `injured_in` | essential | diagnosis |
| `at_risk_in` | essential | neurovascular_risk |
| `explains_instability` | essential | instability |
| `surgical_landmark_for` | supporting | approach |
| `involves_anatomy` (general) | supporting | diagnosis |
| `adjacent_to` | background | — |
| `part_of` | background | — |

Defaults are starting points — curators override based on clinical judgment.

---

## 8. How Anatomy Connects to the Rest of the Network

Anatomy is the hub. This section defines **expected connection categories** from anatomy to every other major object class.

### 8.1 Diagnoses (`condition`)

| Connection | Predicate | Direction | Example |
|------------|-----------|-----------|---------|
| Damaged structure | `injured_in` | condition → anatomy | Ankle fracture → lateral malleolus |
| General involvement | `involves_anatomy` | condition → anatomy | Ankle fracture → ankle ring |
| At-risk nerve/vessel | `at_risk_structure` | condition → anatomy | Supracondylar → AIN |
| Compression | `compressed_in` | condition → anatomy | CTS → median nerve |
| Instability mechanism | `explains_instability` | anatomy → condition OR condition → anatomy | Deltoid rupture → ankle instability |
| Prerequisite | `prerequisite_for` | anatomy → condition | Ankle ring → ankle fracture |
| Symptom explanation | `explains_symptom` | anatomy → clinical_sign | Median nerve → thenar numbness |

### 8.2 Procedures

| Connection | Predicate | Example |
|------------|-----------|---------|
| Target anatomy | `involves_anatomy` | ORIF → distal radius |
| Structures at risk | `at_risk_in`, `must_protect_during` | Volar approach → median nerve |
| Approach interval | `approach_interval_for` | Kaplan interval → volar wrist approach |
| Landmark | `surgical_landmark_for` | Radial styloid → volar approach |
| Implant site | `involves_anatomy` | THA → acetabulum |

### 8.3 Imaging findings

Imaging findings interpret **anatomical relationships**. Connect:

- finding → anatomy (`involves_anatomy` or finding-specific localization edge)
- finding → `explains_instability` → joint/structure
- anatomy → finding via claims (`imaging_point` on anatomy or finding entity)

Example: medial clear space widening → deltoid ligament / medial malleolus anatomy.

### 8.4 Exam maneuvers

| Connection | Predicate | Example |
|------------|-----------|---------|
| Maneuver tests structure | `examines` | Lachman → ACL (ligament anatomy) |
| Structure tested by maneuver | `tested_by` | ACL → Lachman |
| Symptom localization | `explains_symptom` | SLR → L5 nerve root |

### 8.5 Complications

| Connection | Predicate | Example |
|------------|-----------|---------|
| Damaged structure | `injured_in` | AVN → femoral head |
| Risk from anatomy | `at_risk_structure` | THA dislocation → posterior soft tissues |
| Vascular supply loss | `supplied_by` (on bone) | Femoral head ← MFCA → AVN risk claim |

### 8.6 Implants

| Connection | Predicate | Example |
|------------|-----------|---------|
| Attachment site | `involves_anatomy` | Plate → volar distal radius |
| Articulating component | `articulates_with` / joint link | Acetabular cup → acetabulum |

### 8.7 Classifications

Classifications often grade **anatomical disruption**:

- Weber B → lateral malleolus injury pattern
- Garden → femoral head/neck relationship
- Connect `classification_grade` → `injured_in` → anatomy
- Connect `explains_instability` from anatomy → grade implications via claims

### 8.8 Decision points

Decision points frequently hinge on anatomical thresholds:

- Unstable mortise → operative fixation (anatomy: syndesmosis, deltoid)
- CES → urgent MRI (anatomy: canal, cauda equina)

DPs link to anatomy via:

- `linked_relationship_id` on the decision point
- Supporting claims on anatomy entities
- `relevance_reason = instability` or `reduction` on edges

### 8.9 Claims

Claims explain **why anatomy matters** without duplicating relationship structure:

| Claim type | Anatomy attachment |
|------------|-------------------|
| `anatomy_pearl` | On anatomy entity |
| `red_flag` | On nerve, vessel, compartment entities |
| `imaging_point` | On anatomy or linked finding |
| `cognitive_trap` | On clinical entity, referencing anatomy via relationship |
| `operative_pearl` | On procedure, referencing `must_protect_during` anatomy |

### 8.10 Anki cards and questions

Assets link to anatomy objects by ID:

- `supported_by_card`: anatomy → card
- Question entity links → anatomy hub for OITE traversal

**Assets do not define anatomy.** Cards about median nerve anatomy link to the median nerve object — they do not become the definition.

### Connection diagram

```
                         ┌──────────────┐
                         │   anatomy    │
                         │   structure  │
                         └──────┬───────┘
    ┌──────────┬──────────┼──────────┬──────────┬──────────┐
    ▼          ▼          ▼          ▼          ▼          ▼
condition  procedure  imaging    exam      implant   classification
    │          │       finding   maneuver      │           │
    └────┬─────┴────┬─────┴────┬─────┴────┬─────┴─────┬─────┘
         ▼          ▼          ▼          ▼           ▼
    complication  decision   claim      card      question
                  point
```

---

## 9. Anatomy Completeness Standards by Object Type

Completeness is **type-relative**. An anatomy object and a diagnosis object have different standards. A nerve and a bone have different standards.

"Complete" means: **fit for declared maturity level with anatomy dimensions satisfied** — not every possible edge.

### 9.1 Diagnosis (`condition`)

| Standard | Requirement |
|----------|-------------|
| **Injury site** | ≥1 `injured_in` or precise `involves_anatomy` to bone/joint (essential, `relevance_reason = diagnosis`) |
| **Instability anatomy** | If instability disease: `explains_instability` to ligament/joint (essential) |
| **Neurovascular** | `at_risk_structure` to named nerves/vessels when clinically at risk — not "nearby nerves" |
| **Prerequisite** | Inbound `prerequisite_for` from regional anatomy hub when topic is rotation-critical |
| **Imaging anatomy** | Essential imaging findings linked to structures (`relevance_reason = imaging`) |
| **Metadata** | All essential anatomy edges have `anatomy_role` and `relevance_reason` |
| **Claims** | At least one claim explaining why key anatomy matters (trap or pearl) |

### 9.2 Procedure

| Standard | Requirement |
|----------|-------------|
| **Target anatomy** | `involves_anatomy` to operative site (essential) |
| **Must protect** | `must_protect_during` for every named danger structure (essential, `neurovascular_risk`) |
| **Approach interval** | `approach_interval_for` or `surgical_landmark_for` when approach exists |
| **Inbound from approach** | Linked `surgical_approach` entity connects to same anatomy neighborhood |
| **Implant attachment** | Implant → anatomy edges if applicable |
| **No duplication** | Nerve at risk references canonical nerve object — not procedure-local copy |

### 9.3 Nerve (`anatomy_kind = nerve`)

| Standard | Requirement |
|----------|-------------|
| **Course** | `part_of` / `adjacent_to` / `crosses_joint` edges defining major anatomical relationships |
| **Motor/sensory** | `innervated_by` inbound from structures OR claims specifying distribution |
| **Procedural risk** | Inbound `at_risk_in` / `must_protect_during` from relevant procedures |
| **Compression** | Inbound `compressed_in` from conditions (CTS, compartment if applicable) |
| **Symptom** | `explains_symptom` to clinical signs |
| **Hub score** | ≥3 inbound clinical connections for high-yield nerves (median, radial, sciatic, peroneal) |

### 9.4 Compartment (`anatomy_kind = compartment`)

| Standard | Requirement |
|----------|-------------|
| **Contents** | `contains` edges to muscles/structures |
| **Boundaries** | Claims or relationships to fascial boundaries |
| **Pathology** | Inbound `compressed_in` or condition links (compartment syndrome) |
| **Emergency** | Linked red-flag claims; prerequisite_for emergency conditions |
| **Vascular/nerve** | Major neurovascular structures in territory identified |

### 9.5 Joint (`anatomy_kind = joint`)

| Standard | Requirement |
|----------|-------------|
| **Articulations** | `articulates_with` to constituent bones |
| **Stabilizers** | Ligament connections with `explains_instability` paths |
| **Pathology** | Inbound `injured_in` from conditions |
| **Procedure** | Arthroplasty/arthroscopy `involves_anatomy` inbound |
| **Biomechanics** | Links to biomechanics concepts where stability is taught |

### 9.6 Bone (`anatomy_kind = bone`)

| Standard | Requirement |
|----------|-------------|
| **Articulations** | `articulates_with` at joints |
| **Tendon/ligament attachments** | Key `inserts_on` / ligament edges (high-yield only) |
| **Blood supply** | `supplied_by` when AVN or healing risk is taught (femoral head, talus, scaphoid) |
| **Fracture inbound** | `injured_in` from common fracture conditions |
| **Pediatric** | Physis/apophysis `part_of` when relevant |

### 9.7 Surgical approach

| Standard | Requirement |
|----------|-------------|
| **Interval** | `approach_interval_for` from `surgical_interval` anatomy |
| **Landmarks** | ≥2 `surgical_landmark_for` edges (essential/supporting) |
| **Danger structures** | `must_protect_during` for nerves/vessels |
| **Positioning** | Links to `surgical_positioning` where relevant |
| **Procedure link** | Inbound `uses_approach` from procedure(s) |

---

## 10. Examples

Five regional exemplars demonstrating anatomy as organizing infrastructure.

### 10.1 Distal radius / DRUJ / median nerve

**Anatomy objects:**
- Distal radius (bone, structure)
- DRUJ (joint, structure)
- Median nerve (nerve, structure)
- Volar wrist surgical interval (surgical_interval, substructure)

**Key anatomy ↔ anatomy:**
- Distal radius `articulates_with` ulna (DRUJ)
- Median nerve `crosses_joint` wrist
- Median nerve `adjacent_to` volar distal radius

**Clinical connections:**
- Distal radius fracture `injured_in` distal radius
- Distal radius fracture `at_risk_structure` median nerve
- Volar approach `must_protect_during` median nerve
- Volar approach `approach_interval_for` volar wrist interval
- Median nerve `explains_symptom` thenar numbness
- Distal radius anatomy `prerequisite_for` distal radius fracture

**Metadata highlights:**
- Median nerve on DR fracture: `essential`, `neurovascular_risk`, call + or
- DRUJ on DR fracture: `essential`, `instability` + `reduction`

**Claims (on anatomy or linked):**
- Median nerve: red_flag — incomplete exam before/after reduction
- DRUJ: anatomy_pearl — check DRUJ after radius reduction

### 10.2 Ankle ring / syndesmosis / deltoid

**Anatomy objects:**
- Ankle ring (composite mental-model hub, structure)
- Syndesmosis (ligament complex, structure)
- Deltoid ligament (ligament, structure)
- Lateral malleolus, medial malleolus, talus (bone, structure)

**Key anatomy ↔ anatomy:**
- Ankle ring `contains` malleoli, syndesmosis, deltoid
- Deltoid `inserts_on` medial malleolus
- Talus `articulates_with` tibia and fibula

**Clinical connections:**
- Ankle fracture `injured_in` lateral malleolus (Weber B)
- Ankle fracture `explains_instability` via deltoid rupture / syndesmotic injury
- Medial clear space widening (finding) → deltoid / syndesmosis anatomy
- Weber classification `classification_grade` → lateral malleolus `injured_in`
- Ankle ring `prerequisite_for` ankle fracture

**Metadata highlights:**
- Deltoid: `essential`, `instability`, clinic + call
- Syndesmosis: `essential`, `classification` + `reduction`, or context

### 10.3 Anterior leg compartment

**Anatomy objects:**
- Anterior compartment (compartment, structure)
- Tibialis anterior, EHL, EDL (muscle, structure)
- Anterior tibial artery, deep peroneal nerve (vessel/nerve)

**Key anatomy ↔ anatomy:**
- Anterior compartment `contains` tibialis anterior, EHL, EDL
- Deep peroneal nerve `contained_in_compartment` anterior compartment (territory note via claims if not strict containment)

**Clinical connections:**
- Compartment syndrome `compressed_in` anterior compartment
- Tibial shaft fracture `involves_anatomy` anterior compartment (risk)
- Anterior compartment `prerequisite_for` compartment syndrome
- Fasciotomy `involves_anatomy` anterior compartment

**Metadata highlights:**
- Anterior compartment on CS: `essential`, `diagnosis`, call + or
- Deep peroneal nerve: `supporting`, `neurovascular_risk`

### 10.4 Hip / femoral head blood supply / sciatic nerve

**Anatomy objects:**
- Femoral head (bone/articular_surface, structure)
- Acetabulum (bone, structure)
- Medial femoral circumflex artery (vessel, structure)
- Sciatic nerve (nerve, structure)
- Posterior hip surgical interval (surgical_interval)

**Key anatomy ↔ anatomy:**
- Femoral head `part_of` proximal femur
- Femoral head `supplied_by` MFCA
- Sciatic nerve `adjacent_to` posterior hip capsule

**Clinical connections:**
- Femoral neck fracture `injured_in` femoral head/neck
- Femoral neck fracture `at_risk_structure` MFCA supply (via `supplied_by` + claim)
- AVN `injured_in` femoral head
- THA `must_protect_during` sciatic nerve
- Posterior approach `approach_interval_for` posterior interval
- THA `involves_anatomy` acetabulum, femoral head

**Metadata highlights:**
- MFCA / femoral head supply: `essential`, `complication`, conference + or
- Sciatic nerve on THA: `essential`, `neurovascular_risk`, or

### 10.5 Lumbar canal / cauda equina

**Anatomy objects:**
- Lumbar spinal canal (structure, composite)
- Cauda equina (nerve structure, structure)
- L5 nerve root, S1 nerve root (substructure)

**Key anatomy ↔ anatomy:**
- Cauda equina `part_of` lumbar canal
- Nerve roots `part_of` cauda equina

**Clinical connections:**
- CES `compressed_in` cauda equina
- CES `requires_imaging` MRI → canal anatomy via claims
- Lumbar canal `prerequisite_for` CES
- SLR `examines` L5/S1 roots
- Saddle anesthesia `explains_symptom` via cauda equina anatomy

**Metadata highlights:**
- Cauda equina on CES: `essential`, `diagnosis`, call + emergency
- Canal anatomy: `essential`, `imaging`, call

---

## 11. Anti-Patterns

| Anti-pattern | Why it fails | Correct approach |
|--------------|--------------|------------------|
| **Linking every nearby structure** | Noise; learners cannot prioritize | Essential/supporting/background metadata; cap essential edges per object |
| **Treating all anatomy as equally important** | Products surface 20 structures when 3 matter | `anatomy_role`, `display_priority`, `relevance_reason` |
| **Generic body-region buckets as truth** | "Lower extremity" linked to ankle fracture | Structure-level objects; regions for hierarchy only |
| **Storing anatomy as prose blobs** | Not traversable, not linkable | Relationships + claims; no anatomy paragraphs on condition entities |
| **Duplicating procedure-specific anatomy** | "Median nerve (volar approach)" as separate entity | One median nerve hub; `must_protect_during` per procedure |
| **`involves_anatomy` catch-all** | Dilutes precision; hides at-risk structures | Use `injured_in`, `at_risk_in`, `must_protect_during` specifically |
| **Anatomy without inbound edges** | Hubs are outbound-only islands | Nerve/compartment objects need inbound clinical edges |
| **Substructure explosion** | Unmaintainable graph | Substructure only when relationships differ |
| **Anatomy labels without relationships** | Level 1 identity without network value | Minimum relationship neighborhood before publication |
| **Unreviewed anatomy edges in production** | Safety risk for procedural anatomy | Governance gate on `must_protect_during` and `at_risk_in` |

---

## 12. Quality Metrics

Anatomy quality is measured at the **network level**, not by counting anatomy objects.

### 12.1 Essential anatomy coverage

**Definition:** For each published clinical object, the percentage of **required essential anatomy connections** (per §9) that exist with approved metadata.

**Target:** ≥90% for Level 5+ pilot topics  
**Measurement:** Per-object audit against completeness checklist

### 12.2 Anatomy relationship metadata completeness

**Definition:** Percentage of anatomy edges with `anatomy_role`, `relevance_reason`, `context_relevance`, and `review_status` populated.

**Target:** 100% for `essential` edges on production objects; ≥80% overall on pilot regions  
**Measurement:** Edge-level metadata audit

### 12.3 Anatomy orphan rate

**Definition:** Percentage of `anatomy_structure` objects with **zero inbound clinical relationships** (condition, procedure, finding, approach) AND fewer than 2 anatomy-anatomy edges.

**Target:** <10% within pilot regions (some region containers may be orphans by design)  
**Measurement:** Graph query — orphans flagged for merge or enrichment

### 12.4 Anatomy overlinking rate

**Definition:** Percentage of clinical objects where anatomy edges exceed essential/supporting caps without `background`/`advanced` classification — or where >50% of edges lack `anatomy_role`.

**Target:** <5% of published clinical objects  
**Measurement:** Per-object edge count + metadata audit

**Healthy caps (guidance):**
- Diagnosis: 3–8 essential, ≤5 supporting, background optional
- Procedure: 2–5 essential (must_protect), ≤5 supporting

### 12.5 Anatomy display precision

**Definition:** When a product traversal requests anatomy for an object, the percentage of returned edges that are `essential` or `supporting` with correct `relevance_reason` for the product context.

**Target:** ≥85% precision in pilot smoke tests  
**Measurement:** Product traversal smoke tests with curator review

### Quality dashboard (conceptual)

| Metric | Pilot region | Global |
|--------|--------------|--------|
| Essential coverage | Per-region % | Rolling % |
| Metadata completeness | Per-region % | Rolling % |
| Orphan rate | Per-region % | Total orphans |
| Overlinking rate | Per-region % | Flagged objects |
| Display precision | Per-product % | Smoke test log |

---

## 13. Recommended First Anatomy Buildout

Build anatomy in **regional pilots** that align with high-yield clinical topics from the Vision Blueprint exemplars. Depth in five regions beats shallow coverage everywhere.

### Priority regions

| Region | Why first | Anchor clinical topics | Core anatomy hubs |
|--------|-----------|------------------------|-------------------|
| **Ankle** | High trauma/call yield; exemplar in network plan | Ankle fracture, syndesmotic injury | Ankle ring, malleoli, syndesmosis, deltoid, talus |
| **Distal radius / wrist** | NV risk, DRUJ, volar approach density | DR fracture, CTS | Distal radius, DRUJ, median nerve, volar interval |
| **Leg compartments** | Emergency; anatomy = diagnosis | Compartment syndrome, tibial shaft fracture | Anterior, lateral, deep posterior, superficial posterior compartments |
| **Hip** | Arthroplasty, AVN, fracture — high connectivity | Femoral neck fracture, THA, hip OA | Femoral head, acetabulum, MFCA, sciatic nerve, posterior interval |
| **Lumbar spine** | Emergency CES; imaging-anatomy coupling | CES, lumbar radiculopathy | Lumbar canal, cauda equina, L5/S1 roots |

### Buildout sequence per region

```
Phase A: Structure inventory — name, kind, hierarchy level for all hub structures
Phase B: Anatomy ↔ anatomy edges — part_of, articulates_with, contains, supplied_by
Phase C: Clinical inbound edges — injured_in, at_risk_in, must_protect_during, prerequisite_for
Phase D: Metadata pass — anatomy_role, relevance_reason, context on all essential edges
Phase E: Claims — anatomy_pearl, red_flag on nerves, compartments, blood supply
Phase F: Asset links — cards and questions to anatomy hubs
Phase G: Quality audit — metrics from §12
```

### Cross-region anatomy (defer to Phase 2)

- Shoulder (rotator cuff interval, axillary nerve)
- Knee (compartments, neurovascular, ACL/PCL)
- Elbow (neurovascular, pediatric supracondylar)
- Foot (Lisfranc, hindfoot anatomy)

### Sequencing rationale

1. **Ankle + distal radius** — highest PGY-1 trauma call density
2. **Leg compartments** — emergency where anatomy *is* the diagnosis
3. **Hip** — arthroplasty and AVN connect vascular, nerve, and procedural anatomy
4. **Lumbar spine** — emergency CES; tests compression and imaging-anatomy links

---

## 14. First 10 Implementation Tickets

Planning tickets only. No implementation in this document.

| # | Ticket | Output |
|---|--------|--------|
| 1 | **ANT-001** Publish anatomy ontology plan v1 | This document frozen |
| 2 | **ANT-002** Anatomy kind + hierarchy metadata spec | `anatomy_kind`, `hierarchy_level`, `region` enum definitions |
| 3 | **ANT-003** Anatomy relationship vocabulary spec | §6 predicates + type constraints + registry delta from current `kg-relationship-registry.ts` |
| 4 | **ANT-004** Anatomy relationship metadata spec | §7 fields on `canonical_relationships` or extension table |
| 5 | **ANT-005** Anatomy completeness rubrics | §9 checklists operationalized as curation QA |
| 6 | **ANT-006** Quality metrics + reporting spec | §12 metrics as audit script design |
| 7 | **ANT-007** Pilot buildout: **ankle** anatomy subgraph | First region Phase A–G complete |
| 8 | **ANT-008** Pilot buildout: **distal radius/wrist** + **leg compartments** | Three regions with essential coverage ≥90% |
| 9 | **ANT-009** Pilot buildout: **hip** + **lumbar spine** | Five regions complete |
| 10 | **ANT-010** Anatomy traversal smoke tests | Prepare, CasePrep, BroBot anatomy precision ≥85% on pilots |

### Dependency chain

```
ANT-001 → ANT-002 + ANT-003 + ANT-004 (parallel specs)
        → ANT-005 + ANT-006 (rubrics + metrics)
        → ANT-007 → ANT-008 → ANT-009 (regional buildout)
        → ANT-010 (traversal validation)
```

### Relationship to network-wide tickets

| Network ticket | Anatomy dependency |
|----------------|-------------------|
| ONT-007 Compartment syndrome pilot | Leg compartment anatomy (ANT-008) |
| ONT-008 Ankle fracture + CES pilots | Ankle + lumbar anatomy (ANT-007, ANT-009) |
| ONT-002 Relationship registry v1 | ANT-003 anatomy vocabulary extension |

---

## Closing

Anatomy is the **organizing infrastructure** of the Orthopaedic Knowledge Network. It is not a side table, not a textbook chapter, and not a bag of labels.

When anatomy is modeled correctly:

- Diagnoses, procedures, imaging, exam, complications, and implants **meet in shared structural hubs**
- Products traverse the same graph with different weights — never duplicate nerve courses or compartment boundaries
- Learners build mental models that mirror clinical reasoning: **where is the injury, what is at risk, what explains instability, what must be protected**
- Quality is measurable: essential coverage, metadata completeness, orphan rate, overlinking rate, display precision

The five pilot regions — ankle, distal radius/wrist, leg compartments, hip, lumbar spine — are the first proof that anatomy can carry the network. Everything else in orthopaedics connects through it.

---

## Related Documents

| Document | Relationship |
|----------|--------------|
| [Orthopaedic Knowledge Network Vision Blueprint](./kg-orthopaedic-education-ontology-plan-2026-07-05.md) | Network philosophy; anatomy as backbone (§4) |
| [Canonical Knowledge Object Specification](./canonical-knowledge-object-specification.md) | Universal object anatomy; variable shapes for anatomy_structure |
| [KG Excellence Roadmap](./kg-excellence-roadmap-2026-07-05.md) | Strategic roadmap; single source of truth |

---

*Planning document only. Defines how anatomy should be represented. Implementation follows.*