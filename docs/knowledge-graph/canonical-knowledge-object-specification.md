# SnapOrtho Canonical Knowledge Object Specification

**Date:** 2026-07-05  
**Status:** Planning document — no implementation  
**Scope:** Conceptual specification for a single canonical orthopaedic knowledge object  
**Prerequisite:** [Orthopaedic Knowledge Network Vision Blueprint](./kg-orthopaedic-education-ontology-plan-2026-07-05.md)  
**Audience:** Clinical curation, medical education, engineering, product

---

## Preamble

The [Vision Blueprint](./kg-orthopaedic-education-ontology-plan-2026-07-05.md) defined **how** the Orthopaedic Knowledge Network works — relationships as the core product, anatomy as the structural backbone, metadata as the weighting system, and products as graph traversals rather than static pages.

This document defines **what** one perfectly modeled piece of orthopaedic knowledge actually contains.

It answers a single design question:

> If the world's best orthopaedic educator designed the perfect knowledge object, what would it contain?

Not: *What can we easily extract?*  
Not: *What does Orthobullets look like?*  
Not: *What fields fit in today's schema?*

We design the ideal object first. Implementation — schemas, migrations, ingestion pipelines, product adapters — comes later.

---

## 1. Design Philosophy

### Knowledge should be atomic

Orthopaedic knowledge is not monolithic. A "topic" like ankle fracture is not one blob of text — it is a **constellation** of named clinical things, typed connections, teaching assertions, and management logic that activate together in different contexts.

Atomicity means each piece of knowledge is:

- **Individually addressable** — every assertion, relationship, and entity has a stable canonical ID
- **Individually governable** — review, deprecation, and versioning apply to the smallest meaningful unit
- **Individually reusable** — the same claim about mortise stability can surface in Prepare, BroBot, OITE, and adaptive reinforcement without being copied four times

Atomic knowledge resists drift. When "pulses can be normal in compartment syndrome" lives in one canonical claim, correcting it updates every product simultaneously. When it lives in four study guides, one will be wrong within a year.

### Products should never own knowledge

Prepare, BroBot, CasePrep, OITE drills, and adaptive reinforcement are **experiences** — lenses, filters, and renderers. They assemble `LearningContext` bundles by traversing the canonical network. They do not author, store, or version medical truth.

Product-specific text is a liability:

- It duplicates canonical assertions
- It cannot be reviewed centrally
- It cannot be linked by questions, cards, or future products
- It optimizes for today's UI at the expense of tomorrow's graph

The canonical object is the owner. Products are consumers.

### Objects should be reusable forever

A canonical knowledge object is designed for **decades of reuse**, not one rotation's study guide. Reusability requires:

- **Stable identity** — the object remains the same concept even as surrounding knowledge grows
- **Typed structure** — entity type and clinical kind tell products what kind of neighborhood to expect
- **Separation of content from presentation** — no UI labels, no rotation-specific ordering, no product copy baked into the object
- **Extension without redesign** — new relationship types, metadata dimensions, and asset links attach without restructuring the core object

An ankle fracture object curated in 2026 should still be traversable, linkable, and correctable in 2036 — by products that do not exist yet.

### Everything should reference canonical objects

The Orthopaedic Knowledge Network is the **single source of truth**. Every layer above it holds references, not replicas:

| Layer | Holds | Does not hold |
|-------|-------|---------------|
| **Canonical objects** | Medical and educational truth | UI copy, rotation ordering |
| **Curriculum views** | Ordered lists of object IDs + filter rules | Duplicated teaching prose |
| **Product adapters** | Traversal rules + render templates | Parallel disease definitions |
| **External assets** | Card text, question stems, case narratives | Canonical ontology truth |

When a curriculum view says "tonight's trauma topics," it means a sequence of **canonical entity IDs** and **referenced claim/DP IDs** — not a folder of copied paragraphs.

### Updates should happen once

The canonical object model exists to make **one correction propagate everywhere**:

- A safety-critical claim is reviewed once → approved once → visible in every product that traverses it
- A deprecated classification edge is marked once → hidden from all traversals that respect governance gates
- A new decision point is added once → CasePrep and BroBot both gain the management logic

Duplication is not a scaling strategy. It is technical debt with patient-safety interest.

### The canonical object in one sentence

> A canonical knowledge object is the smallest independently governed unit of orthopaedic knowledge — identity, relationships, educational assertions, metadata, evidence, and governance — that every SnapOrtho product can reference without owning a copy.

It is not a webpage. It is not a study guide. It is not a curriculum topic.

---

## 2. Lifecycle of a Knowledge Object

Every canonical object passes through a governed lifecycle. Objects may stall at intermediate stages; not every imported fragment becomes production-ready. Maturity is explicit and measurable (see [Knowledge Maturity Model](#12-knowledge-maturity-model)).

```
Draft
  ↓
Extraction
  ↓
Normalization
  ↓
Canonicalization
  ↓
Relationship enrichment
  ↓
Metadata enrichment
  ↓
Educational enrichment
  ↓
Expert review
  ↓
Publication
  ↓
Versioning
  ↓
Retirement
```

### Draft

**What happens:** A knowledge fragment exists as raw material — an Orthobullets topic stub, an Anki card cluster, a textbook excerpt, a curator's note, an LLM proposal, a legacy `curriculum_node` label.

**What it is not:** A canonical object. No stable identity. No governance. No product consumption.

**Exit criteria:** A human or governed pipeline decides the fragment represents a **distinct orthopaedic concept** worth canonical investment — not a display bucket, not a duplicate of an existing entity.

### Extraction

**What happens:** Meaning is pulled from source material into structured candidates: a proposed name, entity type, candidate relationships, candidate claims, source citations.

**Philosophy:** Extraction is **lossy and provisional**. The goal is to surface candidates for human judgment, not to assert truth. Extracted claims default to `generated_draft` or `needs_review` — never `verified`.

**Risks:** Ingestion defining ontology — letting whatever Orthobullets calls a topic become the canonical entity without normalization. Extraction proposes; canonicalization decides.

### Normalization

**What happens:** Candidates are reconciled against existing canonical objects. Synonyms are mapped. Duplicates are merged or rejected. Entity type and clinical kind are assigned. Naming follows canonical conventions.

**Key decisions:**
- Is this the same concept as an existing entity (merge)?
- Is this a grade/subtype that should be its own entity vs. metadata on a parent?
- Is granularity correct — specific enough to support relationships, not so specific that the graph fragments?

**Exit criteria:** A unique canonical identity is reserved or confirmed. Aliases link to it. Near-duplicates are resolved.

### Canonicalization

**What happens:** The object receives its **canonical identity layer** — stable ID, canonical name, entity type, clinical kind, scope, granularity, governed aliases. It becomes a first-class node in the network.

**What it still lacks:** Relationship density, educational assertions, expert approval. A newly canonicalized object is **identity without neighborhood** — a named placeholder ready for enrichment.

**Exit criteria:** Identity layer complete. Object appears in entity registry. No product-facing publication yet.

### Relationship enrichment

**What happens:** Typed, directed relationships connect the object to its clinical neighborhood — anatomy, classifications, imaging, procedures, complications, prerequisites, differentials, and more.

**Philosophy:** This is the highest-ROI enrichment stage. The Vision Blueprint principle applies:

> *The value of the KG is not the number of nodes. The value is the quality, density, organization, weighting, and traversability of the relationships between nodes.*

Relationship enrichment is not "add edges until a checklist turns green." It is **curatorial judgment** about which connections are clinically real, educationally high-yield, and traversable.

**Exit criteria:** Core connection pattern for the object's type is substantially met (see [§8](#8-what-makes-an-object-complete)). Relationships carry provisional metadata and provenance.

### Metadata enrichment

**What happens:** Weighting dimensions are applied — to the object itself and to its relationships. Clinical importance, educational importance, board relevance, context relevance, learner stage, frequency, confidence, display priority.

**Philosophy:** Metadata transforms a correct graph into a **useful graph**. Without metadata, traversals return everything equally — noise drowns signal.

**Exit criteria:** Phase-1 metadata dimensions populated for production traversals. Unweighted edges flagged for later curation.

### Educational enrichment

**What happens:** Atomic teaching assertions (claims) and management-changing logic (decision points) attach to the object. Traps, pearls, red flags, clinical scripts, and reasoning chains are authored or curated — not dumped as entity description prose.

**Philosophy:** Claims teach. Decision points decide. Entity labels name. Blurring these layers produces objects that look complete but cannot be traversed by products.

**Exit criteria:** L1 educational completeness for the object's type (variable by shape — see [§9](#9-variable-object-shapes)). Safety-critical content flagged for expedited review.

### Expert review

**What happens:** Qualified reviewers validate identity, relationships, claims, and decision points. Safety-critical and emergency content receives attending-level review. Conflicts are flagged, not silently resolved.

**Governance gates:**
- `review_status` transitions: unreviewed → in_review → approved / rejected / conflicted
- `content_source` must be `verified` for learner-facing publication
- Safety-critical assertions require explicit safety review timestamp and reviewer

**Exit criteria:** All L1 assertions approved. Core relationships approved. No unresolved conflicts on safety-critical content.

### Publication

**What happens:** The object and its attached assertions become visible to product traversals that respect governance gates. Curriculum views may reference it. Assets may link to it.

**What publication is not:** Finished forever. Publication means **fit for current production use at declared maturity level** — not that every optional enrichment category is filled.

### Versioning

**What happens:** Changes to identity, relationships, claims, and decision points are versioned. Corrections create new assertion versions or replacement links — not silent overwrites. Consumers can trace what changed, when, and why.

**Principles:**
- Never hard-delete canonical truth — deprecate with `replacement_*` pointers
- Breaking identity changes (merges, splits) are governance events, not casual edits
- Products cache references by ID; versioning resolves content at traversal time

### Retirement

**What happens:** An object is deprecated when concepts are merged, terminology is superseded, or clinical practice has genuinely moved on. Retirement preserves history, redirects traversals via replacement IDs, and removes the object from active publication — without erasing provenance.

**Retirement is not deletion.** The graph remembers what was once taught and why it changed.

---

## 3. Universal Object Anatomy

Every canonical object — regardless of type — is evaluated against the same **conceptual framework**. This is not a database schema. It is the anatomy of a perfectly modeled knowledge unit.

```
┌─────────────────────────────────────────────────────────────┐
│                     CANONICAL OBJECT                        │
├─────────────────────────────────────────────────────────────┤
│  IDENTITY          Who is this concept?                     │
│  RELATIONSHIPS     How does it connect to the network?      │
│  EDUCATIONAL       What should learners know and do?        │
│  CLINICAL REASONING How do clinicians think through it?     │
│  METADATA          How important is it, when, and for whom? │
│  EVIDENCE          Why should we believe this?              │
│  QUALITY           How complete and trustworthy is it?        │
│  GOVERNANCE        Who approved it and when?                │
│  HISTORY           How has it changed?                      │
│  RELATED ASSETS    What external artifacts link here?       │
└─────────────────────────────────────────────────────────────┘
```

### Identity

**Why it exists:** Without unambiguous identity, the network cannot deduplicate, link, version, or reference. Identity is the object's proper name in the graph — stable across products, sources, and decades.

**Contains (conceptually):** Canonical name, aliases, abbreviations, entity type, clinical kind, scope, granularity, synonym maps, deprecated names, learner-facing name variants.

### Relationships

**Why it exists:** Isolated entities are inert. Relationships are how knowledge becomes traversable. The relationship layer is the object's **connection neighborhood** — its clinical and educational context in the network.

**Contains (conceptually):** Outbound and inbound typed edges, relationship metadata, provenance per edge, optional explainability links to claims.

### Educational assertions

**Why it exists:** Entities name things; they do not teach. Educational assertions are atomic, governable teaching units — facts, traps, pearls, scripts — attached to the object without polluting its label.

**Contains (conceptually):** Claims (by type), linked decision points, learning objectives, misconceptions, pattern-recognition cues. Optional — density varies by object type and maturity.

### Clinical reasoning

**Why it exists:** Expert clinicians do not recall fact lists — they run algorithms. Clinical reasoning captures the **if/then structure** of workup, diagnosis, management, and escalation as traversable decision points and reasoning chains.

**Contains (conceptually):** Decision points, indication/contraindication logic, escalation pathways, differential framing, threshold conditions. Distinct from prose claims because reasoning changes action.

### Metadata

**Why it exists:** The same object serves call coverage, clinic, the OR, and OITE — at different learner stages — without duplication. Metadata weights the object and its edges for context-specific traversal.

**Contains (conceptually):** Clinical, educational, governance, quality, graph, usage, context, review, confidence, and frequency dimensions (see [§7](#7-metadata-layer)).

### Evidence

**Why it exists:** Medical knowledge requires justification. Evidence links assertions to guidelines, literature, society statements, and expert consensus — with quality grading, not just citations.

**Contains (conceptually):** Source references, evidence quality, strength of recommendation, guideline version, citation anchors. Supports trust and periodic re-review.

### Quality

**Why it exists:** Completeness is multidimensional, not a boolean. Quality captures **where the object stands** across clinical, relationship, educational, and review dimensions — and its maturity level.

**Contains (conceptually):** Completeness scores per dimension, maturity level, known gaps, curation priority, last quality audit.

### Governance

**Why it exists:** Learner-facing medical content is a safety surface. Governance records who authored, reviewed, and approved each layer — and what is blocked from publication.

**Contains (conceptually):** Review status, content source, reviewer identities, safety review flags, conflict markers, publication eligibility.

### History

**Why it exists:** Knowledge evolves. History enables audit trails, deprecation chains, and understanding of why an object changed — critical for medicolegal defensibility and educational consistency.

**Contains (conceptually):** Version timeline, merge/split events, deprecation records, replacement pointers, change rationale.

### Related assets

**Why it exists:** Cards, questions, images, and case modules are **evidence and practice artifacts** — not canonical definitions. They link to objects by ID, providing spaced repetition, assessment, and illustration without owning ontology truth.

**Contains (conceptually):** Links to Anki cards, OITE questions, teaching images, case modules, video references. Asset links are many-to-many and optional.

---

## 4. Identity Layer

Identity is the foundation. A relationship without a resolved subject is noise. A claim attached to an ambiguous concept will drift. Identity design deserves more attention than it typically receives in medical knowledge systems.

### What defines the identity of a medical concept?

A canonical identity answers: **What is this thing, precisely enough that experts agree we are talking about the same concept — and precisely enough that the graph can connect it correctly?**

### Canonical name

The **preferred, reviewer-approved label** for the object in the network. Not the longest description. Not the most common colloquialism. The name an attending would use on rounds when they want to be unambiguous.

- Good: `Compartment syndrome`
- Good: `Weber B ankle fracture pattern` (as `classification_grade`)
- Weak: `Ankle stuff` / `Foot and ankle trauma module`

The canonical name is stable. Display-friendly variants live in aliases.

### Aliases and synonyms

Orthopaedic concepts arrive with many names. Identity must absorb them without fragmenting the graph:

| Alias type | Example | Purpose |
|------------|---------|---------|
| **Abbreviations** | CS, CES, DR fracture, THA | Search, card matching, question linking |
| **Synonyms** | Peroneal nerve = fibular nerve | Source normalization |
| **Common resident names** | "Weber B" (without "fracture") | Learner search behavior |
| **Common attending names** | "Unstable ankle" (informal) | Conversational BroBot matching |
| **Deprecated names** | Outdated terminology | Historical asset linking |
| **Source-specific labels** | Orthobullets topic title | Ingestion bridge only — not canonical truth |

Aliases **point to** canonical identity. They do not create parallel entities.

### Entity type

The object's **ontological category** — what kind of thing it is in the network. Entity type determines expected connection patterns, required relationships, and which educational categories are typical.

Examples: `condition`, `procedure`, `anatomy_structure`, `classification_system`, `classification_grade`, `complication`, `implant`, `surgical_approach`, `exam_maneuver`, `biomechanics_concept`, `clinical_sign`, `imaging_finding`, `diagnostic_test`.

Entity type is not a curriculum folder. It is a **structural contract** for the object's neighborhood.

### Clinical kind

For entities that support subtyping (especially `condition`), clinical kind refines identity without exploding entity types:

`fracture | dislocation | degenerative | sports_soft_tissue | infection | pediatric | spine | tumor | syndrome | other`

Clinical kind shapes **which connection patterns apply** — a fracture neighborhood differs from an infection neighborhood.

### Scope

**What clinical universe does this object live in?**

- Anatomical scope: hand, ankle, spine, hip
- Population scope: pediatric, adult, geriatric
- Clinical setting: trauma, elective, emergency, sports

Scope prevents false relationships — pediatric septic hip and adult septic shoulder share a condition type but not an identical neighborhood.

### Granularity

**How specific is this object relative to its parent concepts?**

Granularity is a design choice with graph consequences:

| Too coarse | Just right | Too fine |
|------------|------------|----------|
| "Lower extremity fracture" | "Ankle fracture" | "Weber B with syndesmotic injury on Tuesday" |

Too coarse → relationships are vague, traversals are noisy.  
Too fine → graph fragments, duplicates multiply, curation cost explodes.

**Grades and subtypes** (Weber B, Garden III) should be entities when they carry distinct relationships and management implications — not metadata strings on a parent.

### Ontology identity vs. clinical identity

**Ontology identity** is the graph's stable ID — immutable, merge-aware, versioned.  
**Clinical identity** is how the concept is recognized in practice — names, aliases, signs, defining findings.

Both are required. Ontology identity without clinical identity is unusable. Clinical identity without ontology identity is untraceable.

### Identity anti-patterns

| Anti-pattern | Consequence |
|--------------|-------------|
| Curriculum node title as canonical name | Import buckets become ontology |
| One entity per source document | Duplication, drift |
| Alias as separate entity | Graph fragmentation |
| Over-granular entities | Unmaintainable relationship sprawl |
| Under-granular entities | Meaningless traversals |

---

## 5. Relationship Layer

Relationships are the most valuable part of a canonical object.

A fact in isolation — *"the deltoid ligament stabilizes the medial ankle"* — is useful. A typed, weighted, provenance-backed relationship — **ankle fracture** `involves_anatomy` **deltoid ligament**, with high clinical importance and a linked claim about mortise instability — is **traversable knowledge**. Products can find it, weight it, and surface it in context.

The Vision Blueprint established relationships as the core product. This section defines what makes a relationship **high quality** at the object level.

### Why relationships are more valuable than isolated facts

1. **Clinical reasoning is relational.** Diagnosis is not recall — it is navigation from presentation → anatomy → imaging → classification → management.
2. **Education is contextual.** A learner studying ankle fracture needs to know what ankle fracture *connects to*, not just what it *is called*.
3. **Duplication fails at scale.** If every product embeds its own list of "structures at risk," they will diverge. One `at_risk_structure` edge per nerve, weighted and reviewed, serves all products.
4. **Assessment links to structure.** Questions and cards test relationships implicitly. A card about medial clear space is testing the relationship between instability and imaging — not a free-text paragraph.

### Relationship completeness

**Definition:** The object's neighborhood includes all **clinically expected connection categories** for its entity type and clinical kind — not every possible edge, but no glaring structural voids.

An ankle fracture with zero anatomy edges is incomplete. An ankle fracture with anatomy but no classification or management pathway is incomplete in a different dimension.

Completeness is **type-relative** (see [§9](#9-variable-object-shapes)). A nerve object is complete when innervation and injury-pattern edges exist — not when it has a Weber classification.

### Relationship density

**Definition:** The object's high-yield connections are present with enough redundancy for robust traversal — multiple paths to critical neighbors, not a single brittle chain.

Density is not "maximize edge count." It is **curatorial sufficiency**:

- Are the L1 anatomy connections present?
- Are the management-relevant edges present?
- Can a traversal from this object reach emergency decision points in ≤N hops?
- Are common confusions linked (`commonly_confused_with`, `must_distinguish_from`)?

Sparse graphs feel hollow. Over-dense graphs with low-confidence edges feel noisy. Density targets are set per connection pattern, not globally.

### Relationship confidence

**Definition:** A curated estimate of how certain the network is that this specific connection is clinically valid for this object.

Confidence sources:

- Guideline-backed → high confidence
- Expert consensus → high confidence
- Textbook standard teaching → moderate-high
- Inferred from related objects → moderate, flagged
- LLM-extracted, unreviewed → low, not publication-eligible

Low-confidence edges may exist as **proposals** but must not drive safety-critical traversals until reviewed.

### Relationship direction

**Definition:** Clinical assertions have direction. "Ankle fracture involves deltoid ligament" is not the same as "Deltoid ligament involves ankle fracture" — the first is a diagnosis-anatomy connection; the second is nonsensical as the same predicate.

High-quality relationships respect **typed directionality**. Reversed edges are graph pollution. Symmetric predicates (`commonly_confused_with`) are explicitly bidirectional.

Direction enables traversals that mirror clinical reasoning flow — from condition outward to anatomy, imaging, and treatment — not random graph walks.

### Relationship provenance

**Definition:** Every relationship records **where the assertion came from** and **who validated it**.

Provenance answers: *Why does this edge exist?* Without it, curators cannot audit, reviewers cannot trust, and conflicts cannot be resolved.

Minimum provenance philosophy:

- Source category (guideline, textbook, expert, inferred)
- Derivation method (human curated, extracted, proposed)
- Reviewer and review date for publication-eligible edges

### Relationship weighting

**Definition:** Not all true relationships are equally important. Weighting metadata (see Vision Blueprint §6) lets products prioritize edges without duplicating content.

A single object may have twenty anatomy edges. Weighting identifies the **three that matter for call coverage** vs. the **five that matter for OITE** vs. the **two that matter for the OR**.

High-quality objects have **weighted neighborhoods**, not just connected ones.

### Relationship explainability

**Definition:** A relationship should be **understandable to a learner or curator** without hidden inference.

Explainability mechanisms:

- **Linked claims** — an edge from ankle fracture to medial clear space widening links to a claim explaining mortise instability criteria
- **Human-readable edge rationale** — optional curator note on why the connection matters
- **Predicate semantics** — the relationship type itself carries meaning (`at_risk_structure` vs. `involves_anatomy`)

Unexplainable edges are automation artifacts. They should not reach publication.

### Inbound vs. outbound relationships

A complete object considers **both directions**:

- **Outbound:** What this object connects to (fracture → nerve at risk)
- **Inbound:** What connects to this object (multiple fractures → this nerve)

Inbound richness makes anatomy and classification hubs traversable from many entry points — essential for anatomy as the structural backbone.

### Relationship layer summary

| Quality dimension | Question it answers |
|-------------------|---------------------|
| Completeness | Are expected connection categories present? |
| Density | Are high-yield paths traversable? |
| Confidence | How sure are we this edge is true? |
| Direction | Is the clinical assertion oriented correctly? |
| Provenance | Why does this edge exist? |
| Weighting | How much does this edge matter, when and for whom? |
| Explainability | Can a learner understand why this connection matters? |

---

## 6. Educational Layer

The educational layer is everything a learner needs that is **not captured by identity labels or bare relationships alone**. It is the voice of the expert educator — atomic, governable, and attachable.

Educational content is **not** a prose field on the entity. It is a structured collection of assertions and linked assets, each with its own identity and governance.

### Core educational objects

#### Claims

Atomic teaching assertions. Each claim teaches one thing.

| Claim category | Purpose | Typical attachment |
|----------------|---------|-------------------|
| `fact` | Core true statement | All mature clinical objects |
| `mechanism` | How injury/pathology occurs | Conditions, biomechanics |
| `anatomy_pearl` | High-yield anatomical detail | Anatomy, procedures |
| `imaging_point` | Interpretation pearl | Conditions, imaging findings |
| `classification_pearl` | Grading nuance | Classification systems, grades |
| `cognitive_trap` | Predictable learner error | High-yield conditions |
| `board_trap` | Exam distractor logic | OITE-relevant objects |
| `common_mistake` | Documented learner pattern | Procedures, emergencies |
| `attending_pearl` | Rounds/survival answer | Clinic, OR contexts |
| `operative_pearl` | Technical survival tip | Procedures |
| `red_flag` | Cannot-miss warning | Emergencies, high-risk conditions |
| `clinical_script` | Presentation phrasing | Clinic, rounds |

Claims are optional individually but **categories are expected by object type** — fractures should have traps; emergencies should have red flags.

#### Decision points

Management-changing logic. If/then structure that changes action.

Decision points are **not** claims. "Unstable mortise → operative fixation" is a decision point. "Medial clear space > 4 mm suggests instability" may be a claim feeding a decision point — or a threshold within one.

Every mature condition with operative vs. nonoperative pathways should have at least one verified decision point.

### Extended educational attachments (optional by type)

| Category | Description | When expected |
|----------|-------------|---------------|
| **Common mistakes** | May be `common_mistake` claims or a curated grouping | High-yield diagnoses, procedures |
| **Board traps** | `board_trap` claims + linked questions | OITE-relevant objects |
| **Attending pearls** | `attending_pearl` claims | Clinic/OR-heavy objects |
| **Resident pearls** | Practical tips for junior learners — may be claims with `learner_stage` = PGY-1/2 | Rotation-critical objects |
| **Clinical scripts** | One-liner presentation, consent language, handoff phrases | Clinic, call objects |
| **Mental models** | Framework claims linking multiple relationships ("the ankle ring") | Complex anatomical/management objects |
| **Misconceptions** | `cognitive_trap` + `corrects_misconception` field | Objects with known dangerous errors |
| **Analogies** | Pedagogical comparison claims | Optional — pediatric, biomechanics |
| **Pattern recognition** | Visual/clinical pattern claims | Imaging findings, classifications |
| **Teaching images** | Linked assets illustrating the object | Anatomy, approaches, imaging |
| **Cases** | Linked case modules referencing the object | Procedures, emergencies |
| **Questions** | Linked OITE/practice questions | Board-relevant objects |
| **Anki cards** | Linked canonical cards | High-yield review objects |
| **Learning objectives** | Outcome statements for curriculum views | Objects in structured rotations |

### Optional by design

Not every object needs every category. A **`surgical_positioning`** object may need operative pearls and approach links but not board traps. A **`biomechanics_concept`** may need mechanism claims and anatomy links but not decision points.

**Mandatory vs. optional is determined by object shape** (§9) and **maturity level** (§12) — not by a universal template.

### Educational layer principles

1. **Atomicity** — one claim, one assertion; avoids paragraph drift
2. **Governability** — each assertion reviewed independently
3. **Linkability** — claims link to relationships and decision points they explain
4. **Cap discipline** — L1 claims capped per cluster (~12) to prevent noise
5. **Stage appropriateness** — L4 fellowship nuance does not obscure L1 safety gaps

---

## 7. Metadata Layer

Metadata is how one canonical object serves many contexts without duplication. It is not an afterthought — it is the **tuning system** that makes traversals feel product-native while reading from one graph.

This section defines metadata **philosophy**, not field schemas.

### Clinical metadata

**Purpose:** How does this object matter for patient care?

- Clinical importance (overall)
- Urgency tier (routine, urgent, emergent)
- Safety criticality
- Management impact
- Setting relevance (ED, clinic, OR, inpatient)
- Consequence of miss (patient harm gradient)

Clinical metadata gates **call coverage and BroBot** traversals. An object with emergent safety criticality must surface regardless of educational cap.

### Educational metadata

**Purpose:** How should learners prioritize this object?

- Importance level (L1–L4)
- Learner stage relevance (PGY-1 through fellow)
- Rotation relevance (trauma, sports, spine, pediatrics, etc.)
- Learning objective alignment
- `why_it_matters` — motivational framing (safety, exam, OR survival)
- Prerequisites and readiness signals

Educational metadata gates **Prepare and adaptive** traversals.

### Governance metadata

**Purpose:** Is this object safe to show learners?

- Content source (verified, generated_draft, needs_review, deprecated)
- Review status (unreviewed, in_review, approved, rejected, conflicted)
- Reviewer identity and timestamps
- Safety review flags
- Publication eligibility
- Deprecation and replacement pointers

Governance metadata is a **hard gate** — unapproved content does not publish, regardless of completeness.

### Quality metadata

**Purpose:** Where does this object stand in the completeness journey?

- Maturity level (§12)
- Per-dimension completeness scores
- Known gaps (explicit flags: "missing DP", "anatomy incomplete")
- Curation priority
- Last audit date

Quality metadata drives **curation queues**, not learner-facing display.

### Graph metadata

**Purpose:** How does this object participate in the network structure?

- Connection pattern type (fracture neighborhood, procedure neighborhood, etc.)
- Relationship count by category
- Hub score (for anatomy and classification nodes)
- Traversal depth to emergency DPs
- Orphan status (missing expected inbound/outbound edges)

Graph metadata supports **network health monitoring**.

### Usage metadata

**Purpose:** How is this object actually consumed?

- Product exposure counts (Prepare, BroBot, OITE)
- Question/card link density
- Traversal frequency
- Learner engagement signals (future)

Usage metadata informs **curation ROI** — which objects earn deeper investment.

### Context metadata

**Purpose:** When and where should this object surface?

- Context relevance tags: call, clinic, or, conference, oite, off_service, board_review
- Seasonal relevance (e.g., rotation month)
- Event triggers (pre-op, post-op day 1)

Context metadata enables **Prepare's "tonight's rotation"** without rotation-specific content copies.

### Review metadata

**Purpose:** When must this object be re-examined?

- Last reviewed date
- Review cadence policy (safety L1: 12 months; L2: 24 months)
- Stale flags
- Pending re-review triggers (guideline update, conflict detected)

### Confidence metadata

**Purpose:** How certain is the network about this object's assertions?

- Per-claim confidence
- Per-relationship confidence
- Evidence quality tier
- Expert consensus vs. single-source

Confidence metadata prevents **false precision** — low-confidence objects can exist in draft without polluting production traversals.

### Frequency metadata

**Purpose:** How often does this matter in practice and on exams?

- Clinical encounter frequency proxy
- Exam emphasis / OITE hit rate proxy
- Attending question likelihood
- "Common vs. can't-miss rare" framing

Frequency metadata resolves **competition among L1 objects** when traversal budgets are capped.

### Metadata interaction

Metadata dimensions are **multiplicative, not redundant**. An edge may be:

- Clinically critical (high clinical importance)
- Educationally secondary at PGY-1 (low educational importance at that stage)
- Highly board-relevant (high board_relevance)
- Relevant only in call context (context_relevance = call)

This is what allows one graph to feel like five products.

---

## 8. What Makes an Object "Complete"

Completion is the most important conceptual contribution of this specification.

**Complete does not mean "all fields filled."**  
**Complete means "fit for purpose at a declared maturity level across defined dimensions."**

An object can be **production-ready for call coverage** while still lacking fellowship-level educational depth. An object can be **educationally rich** while still missing verified decision points. Dimensions are explicit; gaps are honest.

### Completion dimensions

#### Clinical completeness

**Definition:** The object correctly represents the clinical concept with accurate identity, appropriate scope/granularity, and no known factual conflicts.

**Signals:** Approved canonical name; correct entity type and clinical kind; no conflicted claims on core facts; scope matches clinical usage.

**Not required for partial maturity:** Full educational depth, all optional claim categories.

#### Relationship completeness

**Definition:** The object's neighborhood satisfies the **connection pattern** for its entity type and clinical kind — expected edge categories present, directionally correct, provenance recorded.

**Signals:** Core predicates populated; no structural voids (e.g., fracture without anatomy); differential links where clinically expected; prerequisite chains for anatomy-backed objects.

**This is the highest-priority completeness dimension.** The Vision Blueprint principle applies: value lives in relationships.

#### Educational completeness

**Definition:** The object carries sufficient curated claims and optional educational attachments for its intended learner contexts at a given importance tier.

**Signals:** L1 claim cap appropriately filled; trap/red-flag categories present where expected; learning objectives linked if in curriculum views; no empty "must know" shell.

**Variable by object shape:** Procedures emphasize operative pearls; classifications emphasize grading pearls and board traps.

#### Reasoning completeness

**Definition:** Management-changing logic is encoded as verified decision points, not buried in prose.

**Signals:** Operative vs. nonoperative pathways represented; emergency escalation DPs present for time-critical objects; decision points link to supporting claims and relationships.

**Critical for:** Conditions, procedures, emergencies. Low priority for anatomy nodes, implants.

#### Anatomical completeness

**Definition:** Anatomical involvement is correctly modeled — structures identified, at-risk structures linked, compartment relationships present where relevant.

**Signals:** `involves_anatomy` and `at_risk_structure` edges reviewed; regional anatomy prerequisites linked; inbound edges from anatomy hub nodes.

**Critical for:** Conditions, procedures, approaches, complications. Primary dimension for anatomy objects themselves (innervation, compartment, origin-insertion neighborhoods).

#### Review completeness

**Definition:** All publication-eligible content has passed appropriate human review.

**Signals:** L1 claims approved; safety-critical content safety-reviewed; relationships approved; no unresolved conflicts.

**Hard gate:** Without review completeness, object does not publish — regardless of other dimensions.

#### Graph completeness

**Definition:** The object is a **well-formed node in the global network** — not an island, not a duplicate, not orphaned.

**Signals:** Merged duplicates resolved; stable canonical ID; inbound and outbound connectivity; linked assets; membership in at least one traversable path from a curriculum entry point (when in active curriculum).

#### Asset completeness

**Definition:** High-yield objects have sufficient linked practice artifacts for assessment and reinforcement.

**Signals:** Linked questions for board-relevant objects; linked cards for spaced repetition priorities; teaching images for anatomical/surgical objects.

**Lowest priority for early maturity** — assets link to objects, they do not define them.

### Completion is multidimensional, not scalar

```
                    ┌─────────────────┐
                    │  Maturity Level  │  ← single declared level (§12)
                    └────────┬────────┘
                             │
     ┌───────────┬───────────┼───────────┬───────────┐
     ▼           ▼           ▼           ▼           ▼
 Clinical   Relationship  Educational  Reasoning   Review
                                     Anatomical
                                     Graph
                                     Asset
```

An object reports **per-dimension status** — not one "percent complete" bar that hides critical gaps.

### Completion anti-patterns

| Anti-pattern | Why it fails |
|--------------|--------------|
| "100% fields filled" | Hides missing DPs and unreviewed edges |
| Claim prose without relationships | Not traversable |
| Relationships without weighting | Not usable by products |
| Educational richness without review | Safety risk |
| Asset links without canonical core | Assessment without teachable truth |

---

## 9. Variable Object Shapes

Consistency without forced templates.

Every canonical object shares the [universal anatomy](#3-universal-object-anatomy) — identity, relationships, educational layer, metadata, governance. But **expected neighborhoods differ by type**. A diagnosis is not a nerve. A classification system is not a procedure.

Variable shapes are **connection pattern contracts**, not different object classes in the database.

### Diagnosis (`condition`)

**Identity emphasis:** Clinical kind (fracture, infection, syndrome), scope, population.

**Relationship neighborhood:**
- Anatomy (involves, at-risk)
- Classification and grades
- Imaging findings and required modalities
- Presenting signs
- Complications and risk factors
- Treatment pathways (fixation, procedures, principles)
- Differentials (must_distinguish_from, commonly_confused_with)
- Prerequisites from regional anatomy

**Educational emphasis:** Mechanism, imaging points, traps, red flags, board traps.

**Reasoning emphasis:** Operative vs. nonoperative DPs; emergency escalation DPs for time-critical diagnoses.

**Example:** Ankle fracture — Weber classification, mortise stability, deltoid injury, ORIF pathway.

### Procedure

**Identity emphasis:** Procedure name, indication scope, anatomical region.

**Relationship neighborhood:**
- Indicated-for conditions
- Surgical approach and positioning
- Implants and fixation methods
- Anatomy involved and at-risk structures
- Complications
- Postop treatment principles

**Educational emphasis:** Operative pearls, complication warnings, indication pearls.

**Reasoning emphasis:** Indication DP, key intraoperative decision, postop priority DP.

**Example:** THA — posterior approach, component types, dislocation risk, OA indication.

### Anatomy structure

**Identity emphasis:** Anatomy kind (bone, joint, nerve, compartment, ligament, tendon, vessel), regional scope, granularity.

**Relationship neighborhood:**
- Containment (compartments, regions)
- Innervation and blood supply (where applicable)
- Injury patterns that involve this structure
- Procedures that put this structure at risk
- Prerequisites for clinical objects in this region
- **Inbound hub edges** from many conditions and procedures

**Educational emphasis:** Anatomy pearls, surface landmarks, dangerous variants.

**Reasoning emphasis:** Low — anatomy objects support reasoning elsewhere.

**Special role:** Structural backbone. Anatomy completeness is measured by **hub connectivity**, not by decision points.

**Example:** Median nerve — course, compression sites, structures at risk in volar approaches, carpal tunnel connection.

### Biomechanics concept

**Identity emphasis:** Concept name, joint/region scope.

**Relationship neighborhood:**
- Anatomy structures involved
- Conditions where concept explains injury/mechanism
- Procedures where concept guides technique

**Educational emphasis:** Mechanism claims, mental models, analogies.

**Reasoning emphasis:** Optional — may inform DPs indirectly.

**Example:** Mortise stability — links to ankle anatomy, Weber patterns, fixation principles.

### Classification system

**Identity emphasis:** System name, body region, defining criteria.

**Relationship neighborhood:**
- Grades as child entities (`classification_grade`)
- Conditions classified by this system
- Treatment implications per grade (via `indicates_treatment` or DPs on grades)

**Educational emphasis:** Classification pearls, board traps on grade confusion.

**Reasoning emphasis:** Grade-to-treatment DPs often live on grades, not the system entity.

**Example:** Weber — A/B/C grades, ankle fracture link, lateral vs. bimalleolar implications.

### Implant

**Identity emphasis:** Implant category, anatomical application.

**Relationship neighborhood:**
- Procedures that use this implant
- Anatomy of attachment/site
- Complications associated
- Conditions treated via those procedures

**Educational emphasis:** Component overview, sizing pearls, compatibility facts.

**Reasoning emphasis:** Low — supports procedure reasoning.

### Complication

**Identity emphasis:** Complication name, severity, time course (early/late).

**Relationship neighborhood:**
- Conditions and procedures that cause it
- Risk factors
- Anatomy affected
- Diagnostic workup links
- Treatment/management principles

**Educational emphasis:** Warning signs, prevention pearls, cognitive traps.

**Reasoning emphasis:** Recognition and response DPs for severe complications.

### Surgical approach

**Identity emphasis:** Approach name, anatomical interval, region.

**Relationship neighborhood:**
- Procedures using this approach
- Anatomy exposed and at risk
- Positioning requirements
- Related implants

**Educational emphasis:** Operative pearls, danger zones, intern-level orientation cues.

### Diagnostic test / imaging finding / exam maneuver / clinical sign

**Identity emphasis:** Test/finding/sign name, modality or exam type.

**Relationship neighborhood:**
- Conditions that require or present with this
- Anatomy interpreted or tested
- Threshold DPs where numeric criteria change management

**Educational emphasis:** Interpretation pearls, sensitivity/specificity claims, technique pearls.

**Reasoning emphasis:** Threshold DPs for findings that change management.

### Shape consistency principle

| Universal across all shapes | Variable by shape |
|----------------------------|-------------------|
| Identity + governance | Expected relationship categories |
| Metadata framework | Educational category emphasis |
| Quality/maturity dimensions | Reasoning completeness requirements |
| Asset linking capability | Connection pattern checklist |

---

## 10. Future-Proofing

Canonical objects must grow for years without redesign. Today's Prepare is not the last product.

### Extension without schema revolution

New information should **attach** to existing objects:

- New claim types → new assertions on existing entities
- New relationship predicates → new edges in existing neighborhoods
- New metadata dimensions → new weighting without moving content
- New asset types → new link tables, same canonical IDs
- New products → new traversal rules, same graph

Objects remain stable **IDs in a growing neighborhood**, not documents that get rewritten.

### Product-agnostic core

The canonical object never contains:

- UI labels or button text
- Product-specific ordering
- Prompt templates for BroBot
- Prepare rotation names
- Rendering hints tied to one frontend

Products may cache **derived** bundles. They must not fork **canonical** truth.

### Forward-compatible enrichment stages

The lifecycle (§2) is intentionally staged. An object at Level 2 (core relationships) remains valid while awaiting Level 4 (decision points). Future products can declare minimum maturity requirements without retroactive redesign.

### Anticipated future attachments

| Future need | How the object model accommodates |
|-------------|-----------------------------------|
| Video surgical atlas | Related asset link + claims on approach entity |
| Patient-facing education | Simplified claim variants with shared canonical ID (or derived views — not duplicated truth) |
| Fellowship modules | L4 claims + new metadata filters on existing objects |
| Quality metrics from outcomes | Usage metadata enrichment — no ontology change |
| AI-generated drafts | Governance layer absorbs proposals; verified layer unchanged |
| New exam formats | New asset links; same claims and DPs |

### Versioning as the growth interface

When knowledge changes, **version — don't overwrite**. Future products reading historical assessment data can resolve what was true at the time. Future curators can audit evolution.

### What future-proofing rejects

- Embedding product logic in canonical objects
- Tying object shape to one ingestion source's format
- Defining completeness as a fixed field checklist that breaks when medicine evolves

---

## 11. Quality Principles

These principles govern every curation, ingestion, and product decision touching canonical objects.

### Never duplicate knowledge

One assertion, one canonical home. Reference it everywhere. Copy nothing.

### Never store product-specific text

If it mentions "Prepare" or "BroBot" or a rotation name, it does not belong in the canonical object.

### Never optimize for today's UI

Design for traversability and reuse. UI trends change; clinical truth does not.

### Never let ingestion define ontology

Sources propose. Curators canonicalize. Orthobullets topic titles are bridges, not identities.

### Relationships over redundancy

Prefer one weighted edge over three claims that restate the same connection in prose.

### Canonical before convenience

It is faster to paste a paragraph into a TS file. It is correct to model a claim, review it, and reference it.

### Quality before quantity

One graph-complete ankle fracture teaches more than fifty orphan entities with labels only.

### Depth before breadth

Safety L1 on pilot topics before fellowship L4 on hundreds of shells. Decision points before decorative claims.

### Completeness is honest

Flag gaps. Report maturity. Do not publish objects that pretend to be finished.

### Safety is gated

Emergency content, red flags, and management DPs require review before publication. No automation bypass.

### Deprecation over deletion

Knowledge evolves. The graph remembers.

---

## 12. Knowledge Maturity Model

Every canonical object carries a **measurable maturity level**. Maturity is not quality score alone — it is **what the object is fit to do** in the network and in products.

Products may declare minimum maturity thresholds:

- Prepare call coverage: ≥ Level 5 with review completeness
- OITE drill seed: ≥ Level 3 with board-trap claims
- BroBot clinical neighbor: ≥ Level 2 with approved core relationships

### Level 0 — Source fragment

**State:** Exists only as imported source material — Orthobullets stub, curriculum node label, unprocessed card, LLM output.

**Capabilities:** None. Not in the canonical graph.

**Example:** A `curriculum_nodes` row with no `canonical_entities` bridge.

### Level 1 — Canonical identity established

**State:** Stable canonical ID, name, entity type, clinical kind, governed aliases. May have zero relationships.

**Capabilities:** Deduplication, referencing, merge governance. Not traversable for learning.

**Example:** `condition:ankle_fracture` exists with aliases but no edges.

### Level 2 — Core relationships reviewed

**State:** Primary neighborhood edges curated and approved — anatomy, key classifications, primary treatment connections.

**Capabilities:** Basic graph traversal. BroBot can surface neighbors. Not yet educationally complete.

**Example:** Ankle fracture with anatomy, Weber, and ORIF edges — approved, minimally weighted.

### Level 3 — Educational assertions curated

**State:** L1 claims authored and approved — facts, traps, pearls appropriate to object shape.

**Capabilities:** Prepare can assemble claim bundles. OITE can link board traps. Still missing verified management logic.

**Example:** Ankle fracture with mortise stability claim and "isolated fibula" trap — approved.

### Level 4 — Decision points verified

**State:** Management-changing decision points authored, reviewed, and linked to supporting claims/relationships.

**Capabilities:** CasePrep and clinical reasoning traversals. Call coverage pathways become reliable.

**Example:** Unstable mortise → operative fixation DP — approved, safety-reviewed.

### Level 5 — Relationship neighborhood complete

**State:** Connection pattern for object type satisfied — differentials, complications, prerequisites, imaging, weighted metadata on core edges.

**Capabilities:** Full product traversals within declared context. Graph completeness dimension satisfied.

**Example:** Ankle fracture passes fracture connection pattern checklist with weighted edges.

### Level 6 — Expert reviewed

**State:** Attending-level review complete for all L1 content, safety-critical material, and core relationships. No unresolved conflicts.

**Capabilities:** Publication-eligible for all standard learner contexts. Governance gates pass.

**Example:** Trauma attending approves ankle fracture object for PGY-1 call.

### Level 7 — Production ready

**State:** Level 6 plus asset links, usage validation, periodic review scheduled, maturity metadata current.

**Capabilities:** Fully integrated into curriculum views and all product traversals. Serves as **exemplar** for adjacent objects.

**Example:** Ankle fracture — linked questions, cards, curriculum view entries, quality audit passed.

### Maturity progression is not strictly linear

An object may reach Level 4 (DPs) before Level 5 (full neighborhood) if emergency pathways are prioritized. Maturity reports **declared level** and **per-dimension gaps** — not a single happy path.

```
Level 0 ──► Level 1 ──► Level 2 ──► Level 3 ──► Level 4
                              ╲         ╱
                               ▼       ▼
                            Level 5 ──► Level 6 ──► Level 7
```

### Using maturity operationally

| Consumer | Typical minimum level |
|----------|----------------------|
| Curriculum view reference | Level 1 (identity) for placeholders; Level 5+ for active rotation topics |
| Prepare | Level 5–6 for call topics |
| BroBot | Level 2+ for neighbor traversal |
| CasePrep | Level 4+ for procedure pathways |
| OITE | Level 3+ with board-trap claims |
| Adaptive reinforcement | Level 3+ on missed-assertion objects |

---

## Closing: What Comes Next

This specification defines **what a perfect canonical knowledge object contains** — identity, relationships, educational assertions, reasoning, metadata, evidence, quality, governance, history, and assets — evaluated across multidimensional completeness and measurable maturity.

It deliberately does not define database tables, ingestion pipelines, or product adapters. Those implementations must conform to this specification, not the reverse.

### Recommended next document: Anatomy Ontology

If this specification defines what **every** object looks like, a dedicated **Anatomy Ontology** document should define the **highest-connectivity domain** in the graph.

Anatomy is the structural backbone of the Orthopaedic Knowledge Network (Vision Blueprint §4). It deserves its own treatment:

- Granularity rules for bones, joints, nerves, compartments, ligaments
- Hub connectivity requirements
- Prerequisite chain architecture
- Innervation and vascular supply modeling
- Regional vs. functional anatomy tensions
- How anatomy objects mature differently from clinical diagnoses

Everything else in orthopaedics connects through anatomy. Its ontology is the foundation beneath this specification.

---

## Related Documents

| Document | Relationship |
|----------|--------------|
| [KG Orthopaedic Education Ontology Plan](./kg-orthopaedic-education-ontology-plan-2026-07-05.md) | Network vision — how the graph works |
| [KG Excellence Roadmap](./kg-excellence-roadmap-2026-07-05.md) | Strategic roadmap and curriculum reference model |
| [KG Prepare Readiness Audit](../audits/kg-prepare-readiness-audit-2026-07-05.md) | Current-state gap analysis |

---

*Planning document only. Defines the ideal canonical knowledge object. Implementation follows.*